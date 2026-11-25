import { HeartPulseIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:p-6">
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))]">
        <ThemeToggle />
      </div>
      <div className="flex items-center gap-2 text-lg font-semibold">
        <HeartPulseIcon className="size-6 text-red-500" aria-hidden />
        BP Tracker
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
