/**
 * Seeds ~60 days of morning/noon/night readings for an existing user.
 * Usage: npm run db:seed -- you@example.com
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: npm run db:seed -- <email of a signed-up user>");

  const { eq } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { reading, user } = await import("../src/db/schema");

  const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (!owner) throw new Error(`No user with email ${email}. Sign up in the app first.`);

  const jitter = (n: number) => Math.round((Math.random() - 0.5) * 2 * n);
  const slots = [
    { period: "morning", hour: 7, sys: 132, dia: 85, pulse: 68 },
    { period: "noon", hour: 13, sys: 124, dia: 80, pulse: 74 },
    { period: "night", hour: 21, sys: 120, dia: 77, pulse: 66 },
  ] as const;

  const rows = [];
  const today = new Date();
  for (let daysAgo = 59; daysAgo >= 0; daysAgo--) {
    const improvement = Math.round((59 - daysAgo) / 10); // gentle downward trend
    for (const s of slots) {
      if (Math.random() < 0.1) continue; // skip some, like real life
      const measuredAt = new Date(today);
      measuredAt.setDate(today.getDate() - daysAgo);
      measuredAt.setHours(s.hour, Math.floor(Math.random() * 45), 0, 0);
      if (measuredAt > today) continue;
      rows.push({
        userId: owner.id,
        period: s.period,
        systolic: s.sys - improvement + jitter(8),
        diastolic: s.dia - Math.round(improvement / 2) + jitter(5),
        pulse: s.pulse + jitter(6),
        measuredAt,
      });
    }
  }

  await db.insert(reading).values(rows);
  console.log(`Inserted ${rows.length} readings for ${email}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
