"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth-client";
import { syncTimeZoneCookie } from "@/lib/timezone";

const COPY = {
  "sign-in": {
    title: "Sign in",
    description: "Welcome back. Enter your email and password.",
    submit: "Sign in",
    pending: "Signing in…",
    alt: { text: "No account yet?", href: "/sign-up", link: "Create one" },
  },
  "sign-up": {
    title: "Create account",
    description: "Start tracking your blood pressure.",
    submit: "Create account",
    pending: "Creating account…",
    alt: { text: "Already have an account?", href: "/sign-in", link: "Sign in" },
  },
} as const;

export function AuthForm({ mode }: { mode: keyof typeof COPY }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const copy = COPY[mode];

  function handleSubmit(formData: FormData) {
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));
    setError(null);

    startTransition(async () => {
      syncTimeZoneCookie();
      const { error } =
        mode === "sign-up"
          ? await signUp.email({ email, password, name: String(formData.get("name")) })
          : await signIn.email({ email, password });

      if (error) {
        setError(error.message ?? "Something went wrong. Try again.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="grid gap-4">
          {mode === "sign-up" ? (
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" autoComplete="name" required maxLength={80} />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              {mode === "sign-in" ? (
                <Link href="/forgot-password" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  Forgot password?
                </Link>
              ) : null}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="mt-4 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? copy.pending : copy.submit}
          </Button>
          <p className="text-sm text-muted-foreground">
            {copy.alt.text}{" "}
            <Link href={copy.alt.href} className="font-medium text-foreground underline underline-offset-4">
              {copy.alt.link}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
