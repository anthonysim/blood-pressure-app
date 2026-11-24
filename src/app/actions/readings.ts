"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { reading } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { PERIODS } from "@/lib/bp";
import { getTimeZone, parseLocalDateTime } from "@/lib/dates";

export type ReadingFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"systolic" | "diastolic" | "pulse" | "period" | "measuredAt" | "notes", string[]>>;
};

const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.coerce.number().int().min(min).max(max).optional(),
  );

const readingSchema = z
  .object({
    systolic: z.coerce.number().int().min(50, "Too low").max(300, "Too high"),
    diastolic: z.coerce.number().int().min(30, "Too low").max(200, "Too high"),
    pulse: optionalInt(20, 250),
    period: z.enum(PERIODS),
    measuredAt: z.string().min(1, "Required"),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.systolic > v.diastolic, {
    message: "Systolic must be higher than diastolic",
    path: ["systolic"],
  });

const idSchema = z.uuid();

async function parseForm(formData: FormData) {
  const parsed = readingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { state: { fieldErrors: z.flattenError(parsed.error).fieldErrors } as ReadingFormState };
  }
  const measuredAt = parseLocalDateTime(parsed.data.measuredAt, await getTimeZone());
  if (!measuredAt) return { state: { fieldErrors: { measuredAt: ["Invalid date/time"] } } };
  if (measuredAt.getTime() > Date.now() + 5 * 60_000) {
    return { state: { fieldErrors: { measuredAt: ["Can't be in the future"] } } };
  }
  return { values: { ...parsed.data, pulse: parsed.data.pulse ?? null, notes: parsed.data.notes || null, measuredAt } };
}

export async function createReading(_prev: ReadingFormState, formData: FormData): Promise<ReadingFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };

  const result = await parseForm(formData);
  if (!result.values) return result.state;

  await db.insert(reading).values({ ...result.values, userId: user.id });
  revalidatePath("/", "layout");
  redirect("/readings");
}

export async function updateReading(
  id: string,
  _prev: ReadingFormState,
  formData: FormData,
): Promise<ReadingFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  if (!idSchema.safeParse(id).success) return { error: "Reading not found." };

  const result = await parseForm(formData);
  if (!result.values) return result.state;

  const updated = await db
    .update(reading)
    .set(result.values)
    .where(and(eq(reading.id, id), eq(reading.userId, user.id)))
    .returning({ id: reading.id });
  if (updated.length === 0) return { error: "Reading not found." };

  revalidatePath("/", "layout");
  redirect("/readings");
}

export async function deleteReading(id: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in." };
  if (!idSchema.safeParse(id).success) return { error: "Reading not found." };

  await db.delete(reading).where(and(eq(reading.id, id), eq(reading.userId, user.id)));
  revalidatePath("/", "layout");
  return {};
}
