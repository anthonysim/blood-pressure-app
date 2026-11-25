import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_PAGES = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];
const SESSION_COOKIES = ["session_token", "session_data", "dont_remember"].flatMap((name) => [
  `better-auth.${name}`,
  `__Secure-better-auth.${name}`,
]);

/** Asks Better Auth whether the session cookie is actually valid (not just present). */
async function hasValidSession(request: NextRequest): Promise<boolean> {
  try {
    const res = await fetch(new URL("/api/auth/get-session", request.url), {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { session?: unknown } | null;
    return Boolean(body?.session);
  } catch {
    return false;
  }
}

// App pages: optimistic check only (cookie presence); real validation happens in requireUser(),
// which redirects to /sign-in when the session is invalid.
// Auth pages: validate for real. A stale cookie (expired, revoked, or signed with a rotated
// secret) must not bounce the user back to /dashboard, or the two redirects loop forever.
export async function proxy(request: NextRequest) {
  const hasCookie = Boolean(getSessionCookie(request));
  const isAuthPage = AUTH_PAGES.includes(request.nextUrl.pathname);

  if (!isAuthPage) {
    return hasCookie ? NextResponse.next() : NextResponse.redirect(new URL("/sign-in", request.url));
  }
  if (!hasCookie) return NextResponse.next();

  if (await hasValidSession(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  const response = NextResponse.next();
  for (const name of SESSION_COOKIES) {
    if (request.cookies.has(name)) response.cookies.delete(name);
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)"],
};
