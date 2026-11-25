"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, resetPassword } from "@/lib/auth-client";

const linkClass = "font-medium text-foreground underline underline-offset-4";

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const email = String(formData.get("email")).trim();
    setError(null);
    startTransition(async () => {
      const { error } = await requestPasswordReset({ email, redirectTo: "/reset-password" });
      if (error) {
        setError(
          error.status === 429
            ? "Too many requests. Wait a minute and try again."
            : (error.message ?? "Something went wrong. Try again."),
        );
        return;
      }
      setSentTo(email);
    });
  }

  if (sentTo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, we sent a link to
            reset your password. It expires in 1 hour. Check your spam folder if you don&apos;t see it.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3">
          <Link href="/sign-in" className={buttonVariants({ variant: "outline", className: "w-full" })}>
            Back to sign in
          </Link>
          <button type="button" className="text-sm text-muted-foreground underline underline-offset-4" onClick={() => setSentTo(null)}>
            Use a different email
          </button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>Enter your email and we&apos;ll send you a link to reset your password.</CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="mt-4 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link href="/sign-in" className={linkClass}>
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

function InvalidLink() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Link expired</CardTitle>
        <CardDescription>
          This reset link is invalid, expired, or already used. Request a new one.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col gap-3">
        <Link href="/forgot-password" className={buttonVariants({ className: "w-full" })}>
          Request a new link
        </Link>
        <Link href="/sign-in" className="text-sm text-muted-foreground underline underline-offset-4">
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!token || expired) return <InvalidLink />;

  function handleSubmit(formData: FormData) {
    const newPassword = String(formData.get("password"));
    if (newPassword !== String(formData.get("confirm"))) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const { error } = await resetPassword({ newPassword, token: token! });
      if (error) {
        if (error.code === "INVALID_TOKEN") setExpired(true);
        else setError(error.message ?? "Something went wrong. Try again.");
        return;
      }
      toast.success("Password updated. Sign in with your new password.");
      router.replace("/sign-in");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>You&apos;ll be signed out on other devices.</CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="mt-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saving…" : "Update password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
