"use client";

import { BanIcon, KeyRoundIcon, MoreHorizontalIcon, ShieldCheckIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  banUserAction,
  deleteUserAction,
  resetPasswordAction,
  unbanUserAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePassword, PasswordField } from "./password-field";

type Target = { id: string; name: string; email: string; banned: boolean };
type Mode = "reset" | "ban" | "delete" | null;

/** Row menu: reset password, ban/unban, delete. Each destructive step confirms in a dialog. */
export function UserActions({ user }: { user: Target }) {
  const [mode, setMode] = useState<Mode>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<AdminActionState>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setMode(null);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.email}`} disabled={isPending} />}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setMode("reset")}>
            <KeyRoundIcon aria-hidden />
            Reset password
          </DropdownMenuItem>
          {user.banned ? (
            <DropdownMenuItem onClick={() => run(() => unbanUserAction(user.id))}>
              <ShieldCheckIcon aria-hidden />
              Unban
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setMode("ban")}>
              <BanIcon aria-hidden />
              Ban
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setMode("delete")}>
            <Trash2Icon aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={mode !== null} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent>
          {mode === "reset" ? (
            <ResetPassword user={user} pending={isPending} onSubmit={(pw) => run(() => resetPasswordAction(user.id, pw))} />
          ) : mode === "ban" ? (
            <BanUser user={user} pending={isPending} onSubmit={(reason) => run(() => banUserAction(user.id, reason))} />
          ) : mode === "delete" ? (
            <DeleteUser user={user} pending={isPending} onConfirm={() => run(() => deleteUserAction(user.id))} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResetPassword({ user, pending, onSubmit }: { user: Target; pending: boolean; onSubmit: (password: string) => void }) {
  const [password, setPassword] = useState(() => generatePassword());
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(password);
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle>Reset password</DialogTitle>
        <DialogDescription>
          Set a new temporary password for {user.name} ({user.email}). They&apos;ll be signed out on all devices.
        </DialogDescription>
      </DialogHeader>
      <PasswordField id="reset-password" value={password} onChange={setPassword} />
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" disabled={pending} />}>Cancel</DialogClose>
        <Button type="submit" disabled={pending || password.length < 8}>
          {pending ? "Saving…" : "Set password"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function BanUser({ user, pending, onSubmit }: { user: Target; pending: boolean; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(reason);
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle>Ban {user.name}?</DialogTitle>
        <DialogDescription>
          They&apos;ll be signed out and can&apos;t sign in until unbanned. Their readings are kept.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="ban-reason">Reason (optional, only you see it)</Label>
        <Input id="ban-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" disabled={pending} />}>Cancel</DialogClose>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Banning…" : "Ban user"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeleteUser({ user, pending, onConfirm }: { user: Target; pending: boolean; onConfirm: () => void }) {
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim().toLowerCase() === user.email.toLowerCase();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmed) onConfirm();
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle>Delete {user.name}?</DialogTitle>
        <DialogDescription>
          This permanently deletes their account and all of their readings and saved searches. This can&apos;t be undone.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="delete-confirm">
          Type <span className="font-mono font-medium text-foreground">{user.email}</span> to confirm
        </Label>
        <Input id="delete-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" type="button" disabled={pending} />}>Cancel</DialogClose>
        <Button type="submit" variant="destructive" disabled={pending || !confirmed}>
          {pending ? "Deleting…" : "Delete permanently"}
        </Button>
      </DialogFooter>
    </form>
  );
}
