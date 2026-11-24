"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { savedSearch } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { parseFilters, serializeFilters } from "@/lib/filters";

const saveSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  query: z.string().max(2000),
});

export async function saveSearch(input: { name: string; query: string }): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  // Re-parse so only valid, canonical filters are stored.
  const query = serializeFilters(parseFilters(new URLSearchParams(parsed.data.query)));
  await db.insert(savedSearch).values({ userId: user.id, name: parsed.data.name, query });
  revalidatePath("/", "layout");
  return {};
}

export async function deleteSavedSearch(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  if (!z.uuid().safeParse(id).success) return { error: "Not found." };

  await db.delete(savedSearch).where(and(eq(savedSearch.id, id), eq(savedSearch.userId, user.id)));
  revalidatePath("/", "layout");
  return {};
}
