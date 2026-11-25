"use client";

import { CopyIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"; // no look-alikes (0/O, 1/l/I)

export function generatePassword(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Controlled temporary-password input with Generate and Copy buttons. */
export function PasswordField({
  id,
  name,
  value,
  onChange,
}: {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  async function copy() {
    await navigator.clipboard.writeText(value);
    toast.success("Password copied");
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Temporary password</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          minLength={8}
          maxLength={128}
          required
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
        />
        <Button type="button" variant="outline" size="icon" onClick={() => onChange(generatePassword())} aria-label="Generate password">
          <RefreshCwIcon />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={copy} disabled={!value} aria-label="Copy password">
          <CopyIcon />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Share it with them privately. They can sign in with it right away.</p>
    </div>
  );
}
