import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { UserActions } from "@/components/admin/user-actions";
import { ListPageSkeleton } from "@/components/skeletons";
import { PageTransition, Reveal } from "@/components/transitions";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminOverview, type AdminUserRow } from "@/lib/admin-data";
import { formatInZone, getTimeZone } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <PageTransition>
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Suspense fallback={<ListPageSkeleton />}>
          <Reveal>
            <div className="grid gap-4">
              <AdminContent searchParams={searchParams} />
            </div>
          </Reveal>
        </Suspense>
      </div>
    </PageTransition>
  );
}

async function AdminContent({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const { q } = await searchParams;
  const search = typeof q === "string" ? q.slice(0, 100) : "";
  const [{ meId, users, truncated, totals }, tz] = await Promise.all([getAdminOverview(search), getTimeZone()]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Users" value={totals.users} />
        <Stat label="Active in last 7 days" value={totals.activeThisWeek} />
        <Stat label="Readings logged" value={totals.readings} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Form action="/admin" replace className="flex-1 sm:max-w-xs" role="search">
          <Input name="q" type="search" defaultValue={search} placeholder="Search name or email" aria-label="Search users" />
        </Form>
        <CreateUserDialog />
      </div>

      {users.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">
          {search ? `No users match “${search}”.` : "No users yet."}
        </p>
      ) : (
        <UsersTable users={users} meId={meId} tz={tz} />
      )}
      {truncated ? <p className="text-sm text-muted-foreground">Showing the newest 200. Search to find others.</p> : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value.toLocaleString()}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function UsersTable({ users, meId, tz }: { users: AdminUserRow[]; meId: string; tz: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Readings</TableHead>
            <TableHead>Last reading</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id} className={cn(u.banned && "opacity-60")}>
              <TableCell>
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </TableCell>
              <TableCell>
                <StatusBadge role={u.role} banned={u.banned} reason={u.banReason} isMe={u.id === meId} />
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatInZone(u.createdAt, "MMM d, yyyy", tz)}</TableCell>
              <TableCell className="text-right tabular-nums">{u.readings.toLocaleString()}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {u.lastReadingAt ? formatInZone(u.lastReadingAt, "MMM d, yyyy", tz) : "—"}
              </TableCell>
              <TableCell>
                {u.id === meId ? null : (
                  <UserActions user={{ id: u.id, name: u.name, email: u.email, banned: u.banned }} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({ role, banned, reason, isMe }: { role: string; banned: boolean; reason: string | null; isMe: boolean }) {
  const [label, className] = banned
    ? ["Banned", "bg-destructive/10 text-destructive"]
    : role === "admin"
      ? [isMe ? "Admin (you)" : "Admin", "bg-primary/15 text-primary"]
      : ["Active", "bg-muted text-muted-foreground"];
  return (
    <span title={banned && reason ? `Reason: ${reason}` : undefined} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", className)}>
      {label}
    </span>
  );
}
