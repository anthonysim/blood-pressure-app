"use client";

import { UserPlusIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { createUserAction, type AdminActionState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generatePassword, PasswordField } from "./password-field";

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  // Remount the form each time the dialog opens so fields and errors start fresh.
  const [formKey, setFormKey] = useState(0);

  function handleOpenChange(next: boolean) {
    if (next) setFormKey((k) => k + 1);
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <UserPlusIcon aria-hidden />
        Add user
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a user</DialogTitle>
          <DialogDescription>Create an account and give them the temporary password.</DialogDescription>
        </DialogHeader>
        <CreateUserForm key={formKey} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState(() => generatePassword());
  const [state, formAction, isPending] = useActionState(async (prev: AdminActionState, formData: FormData) => {
    const result = await createUserAction(prev, formData);
    if (result.ok) {
      toast.success(result.message);
      onDone();
    }
    return result;
  }, {});

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="new-user-name">Name</Label>
        <Input id="new-user-name" name="name" required maxLength={80} autoComplete="off" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-user-email">Email</Label>
        <Input id="new-user-email" name="email" type="email" required autoComplete="off" />
      </div>
      <PasswordField id="new-user-password" name="password" value={password} onChange={setPassword} />
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create user"}
        </Button>
      </DialogFooter>
    </form>
  );
}
