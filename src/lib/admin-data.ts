import "server-only";
import { count, desc, eq, gte, ilike, max, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { reading, user } from "@/db/schema";
import { requireAdmin } from "./auth";

const PAGE_SIZE = 200;

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason: string | null;
  createdAt: Date;
  readings: number;
  lastReadingAt: Date | null;
};

export async function getAdminOverview(search?: string) {
  const me = await requireAdmin();
  const term = search?.trim();
  const where = term ? or(ilike(user.name, `%${term}%`), ilike(user.email, `%${term}%`)) : undefined;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [users, [userTotal], [readingTotal], [activeThisWeek]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        createdAt: user.createdAt,
        readings: count(reading.id),
        lastReadingAt: max(reading.measuredAt),
      })
      .from(user)
      .leftJoin(reading, eq(reading.userId, user.id))
      .where(where)
      .groupBy(user.id)
      .orderBy(desc(user.createdAt))
      .limit(PAGE_SIZE),
    db.select({ n: count() }).from(user),
    db.select({ n: count() }).from(reading),
    db
      .select({ users: sql<number>`count(distinct ${reading.userId})::int` })
      .from(reading)
      .where(gte(reading.measuredAt, weekAgo)),
  ]);

  return {
    meId: me.id,
    users: users satisfies AdminUserRow[],
    truncated: users.length === PAGE_SIZE,
    totals: { users: userTotal.n, readings: readingTotal.n, activeThisWeek: activeThisWeek.users },
  };
}
