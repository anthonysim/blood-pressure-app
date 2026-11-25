"use client";

import { ClipboardListIcon, LayoutDashboardIcon, TrendingUpIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboardIcon },
  { href: "/readings", label: "Readings", Icon: ClipboardListIcon },
  { href: "/trends", label: "Trends", Icon: TrendingUpIcon },
] as const;

function isActive(pathname: string | undefined, href: string) {
  return pathname !== undefined && (pathname === href || pathname.startsWith(`${href}/`));
}

/** Nav with the current section highlighted. Reads the URL, so render inside <Suspense>. */
export function NavLinks() {
  return <NavLinksView pathname={usePathname()} />;
}

/** Static version (no highlight) used as the Suspense fallback in the prerendered shell. */
export function NavLinksView({ pathname }: { pathname?: string }) {
  return (
    <nav aria-label="Primary" className="flex items-center gap-1 text-sm">
      {LINKS.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-muted text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Bottom tab bar for phones (< sm). Reads the URL, so render inside <Suspense>. */
export function MobileNav() {
  return <MobileNavView pathname={usePathname()} />;
}

export function MobileNavView({ pathname }: { pathname?: string }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto grid max-w-lg grid-cols-3">
        {LINKS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground active:text-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "stroke-[2.25]")} aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
