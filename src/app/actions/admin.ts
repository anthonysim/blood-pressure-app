"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth, getCurrentUser } from "@/lib/auth";

export type AdminActionState = { ok?: boolean; error?: string; message?: string };

const userId = z.string().min(1).max(100);
const password = z.string().min(8, "Password must be at least 8 characters").max(128);

/** Every admin action re-checks the session; Better Auth also enforces the admin role on its endpoints. */
async function guard(targetId?: string): Promise<{ error: string } | { adminId: string }> {
  const me = await getCurrentUser();
  if (!me?.isAdmin) return { error: "Not authorized." };
  if (targetId && targetId === me.id) return { error: "You can't do that to your own account." };
  return { adminId: me.id };
}

function failure(err: unknown): AdminActionState {
  if (err instanceof APIError) return { error: err.body?.message ?? err.message };
  console.error(err);
  return { error: "Something went wrong. Try again." };
}

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password,
});

export async function createUserAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const g = await guard();
  if ("error" in g) return g;

  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await auth.api.createUser({ headers: await headers(), body: { ...parsed.data, role: "user" } });
  } catch (err) {
    return failure(err);
  }
  revalidatePath("/admin");
  return { ok: true, message: `Created ${parsed.data.email}` };
}

export async function resetPasswordAction(id: string, newPassword: string): Promise<AdminActionState> {
  const g = await guard(id);
  if ("error" in g) return g;
  const parsed = z.object({ id: userId, newPassword: password }).safeParse({ id, newPassword });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const h = await headers();
    await auth.api.setUserPassword({ headers: h, body: { userId: id, newPassword } });
    // Sign them out everywhere so the old password's sessions don't linger.
    await auth.api.revokeUserSessions({ headers: h, body: { userId: id } });
  } catch (err) {
    return failure(err);
  }
  return { ok: true, message: "Password reset. They've been signed out." };
}

export async function banUserAction(id: string, reason: string): Promise<AdminActionState> {
  const g = await guard(id);
  if ("error" in g) return g;
  if (!userId.safeParse(id).success) return { error: "User not found." };

  try {
    await auth.api.banUser({
      headers: await headers(),
      body: { userId: id, banReason: reason.trim().slice(0, 200) || undefined },
    });
  } catch (err) {
    return failure(err);
  }
  revalidatePath("/admin");
  return { ok: true, message: "User banned and signed out." };
}

export async function unbanUserAction(id: string): Promise<AdminActionState> {
  const g = await guard(id);
  if ("error" in g) return g;
  if (!userId.safeParse(id).success) return { error: "User not found." };

  try {
    await auth.api.unbanUser({ headers: await headers(), body: { userId: id } });
  } catch (err) {
    return failure(err);
  }
  revalidatePath("/admin");
  return { ok: true, message: "User unbanned." };
}

export async function deleteUserAction(id: string): Promise<AdminActionState> {
  const g = await guard(id);
  if ("error" in g) return g;
  if (!userId.safeParse(id).success) return { error: "User not found." };

  try {
    // Readings, saved searches, sessions and accounts are removed by ON DELETE CASCADE.
    await auth.api.removeUser({ headers: await headers(), body: { userId: id } });
  } catch (err) {
    return failure(err);
  }
  revalidatePath("/admin");
  return { ok: true, message: "User and all their data deleted." };
}
