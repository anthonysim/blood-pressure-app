import { HeartPulseIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { MobileNav, MobileNavView, NavLinks, NavLinksView } from "@/components/nav-links";
import { QuickAddReadingDialog } from "@/components/quick-add-reading-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { TimezoneSync } from "@/components/timezone-sync";
import { UserMenu } from "@/components/user-menu";
import { requireUser } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b bg-card/85 pt-[env(safe-area-inset-top)] backdrop-blur [view-transition-name:site-header]">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:gap-4">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2 font-semibold">
            <HeartPulseIcon className="size-5 text-red-500" aria-hidden />
            <span>BP Tracker</span>
          </Link>
          <div className="hidden sm:block">
            <Suspense fallback={<NavLinksView />}>
              <NavLinks />
            </Suspense>
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <QuickAddReadingDialog compactTrigger />
            <ThemeToggle />
            <Suspense fallback={<div className="size-8 rounded-full bg-muted" />}>
              <CurrentUserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-24 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:py-6">
        {children}
      </main>
      <div className="no-print sm:hidden">
        <Suspense fallback={<MobileNavView />}>
          <MobileNav />
        </Suspense>
      </div>
      <TimezoneSync />
    </>
  );
}

async function CurrentUserMenu() {
  const user = await requireUser();
  return <UserMenu name={user.name} email={user.email} isAdmin={user.isAdmin} />;
}
