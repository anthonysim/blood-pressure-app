import { HeartPulseIcon } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <HeartPulseIcon className="size-6 text-red-500" aria-hidden />
        BP Tracker
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
