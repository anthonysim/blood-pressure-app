import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import * as schema from "@/db/schema";

const vercelOrigins = [
  process.env.VERCEL_URL, // this deployment's unique URL
  process.env.VERCEL_BRANCH_URL, // stable per-branch preview URL
  process.env.VERCEL_PROJECT_PRODUCTION_URL, // e.g. <project>.vercel.app
]
  .filter(Boolean)
  .map((host) => `https://${host}`);

export const auth = betterAuth({
  // Production sets BETTER_AUTH_URL; previews fall back to their own Vercel URL.
  baseURL: process.env.BETTER_AUTH_URL ?? vercelOrigins[0],
  trustedOrigins: vercelOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,
  },
  plugins: [nextCookies()],
});

export type CurrentUser = { id: string; name: string; email: string };

/** Signed-in user or null. Deduplicated per request via React.cache(). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) return null;
  const { id, name, email } = result.user;
  return { id, name, email };
});

/** Signed-in user, or redirect to /sign-in. Call inside a Suspense boundary. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}
