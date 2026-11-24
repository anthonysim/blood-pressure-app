"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/readings", label: "Readings" },
  { href: "/trends", label: "Trends" },
] as const;

/** Nav with the current section highlighted. Reads the URL, so render inside <Suspense>. */
export function NavLinks() {
  return <NavLinksView pathname={usePathname()} />;
}

/** Static version (no highlight) used as the Suspense fallback in the prerendered shell. */
export function NavLinksView({ pathname }: { pathname?: string }) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map(({ href, label }) => {
        const active = pathname !== undefined && (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-muted font-medium text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
