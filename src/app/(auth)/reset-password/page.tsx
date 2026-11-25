import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/password-reset-forms";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token !== "" && !error;
  return <ResetPasswordForm token={valid ? token : null} />;
}
