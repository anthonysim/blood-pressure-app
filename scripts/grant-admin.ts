/**
 * Makes an existing user an admin (or removes admin with --revoke).
 * Usage: npm run admin:grant -- you@example.com [--revoke]
 * Uses DATABASE_URL from the environment, falling back to .env.local.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

async function main() {
  const email = process.argv[2]?.toLowerCase();
  const revoke = process.argv.includes("--revoke");
  if (!email || email.startsWith("--")) throw new Error("Usage: npm run admin:grant -- <email> [--revoke]");

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { user } = await import("../src/db/schema");

  const updated = await db
    .update(user)
    .set({ role: revoke ? "user" : "admin" })
    .where(eq(user.email, email))
    .returning({ email: user.email, role: user.role });

  if (updated.length === 0) throw new Error(`No user with email ${email}. Sign up first.`);
  console.log(`${updated[0].email} is now: ${updated[0].role}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
