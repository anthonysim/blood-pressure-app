export const TZ_COOKIE = "tz";

export function isValidTimeZone(tz: string | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Client-only: store the browser's time zone in a cookie so the server can compute local day boundaries. */
export function syncTimeZoneCookie(): boolean {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const current = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${TZ_COOKIE}=`))
    ?.split("=")[1];
  if (current && decodeURIComponent(current) === tz) return false;
  document.cookie = `${TZ_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
  return true;
}
