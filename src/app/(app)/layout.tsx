import { HeartPulseIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { NavLinks, NavLinksView } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { TimezoneSync } from "@/components/timezone-sync";
import { buttonVariants } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { requireUser } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-card/85 backdrop-blur [view-transition-name:site-header]">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <HeartPulseIcon className="size-5 text-red-500" aria-hidden />
            <span className="hidden sm:inline">BP Tracker</span>
          </Link>
          <Suspense fallback={<NavLinksView />}>
            <NavLinks />
          </Suspense>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/readings/new" className={buttonVariants({ size: "sm" })}>
              <PlusIcon aria-hidden />
              <span className="hidden sm:inline">Add reading</span>
            </Link>
            <ThemeToggle />
            <Suspense fallback={<div className="size-8 rounded-full bg-muted" />}>
              <CurrentUserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <TimezoneSync />
    </>
  );
}

async function CurrentUserMenu() {
  const user = await requireUser();
  return <UserMenu name={user.name} email={user.email} />;
}
