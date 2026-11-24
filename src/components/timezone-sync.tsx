"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { syncTimeZoneCookie } from "@/lib/timezone";

/** Keeps the `tz` cookie in sync with the browser so server-side date ranges match local days. */
export function TimezoneSync() {
  const router = useRouter();
  useEffect(() => {
    if (syncTimeZoneCookie()) router.refresh();
  }, [router]);
  return null;
}
