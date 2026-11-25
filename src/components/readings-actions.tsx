"use client";

import { DownloadIcon, PrinterIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export function ReadingsActions({ query }: { query: string }) {
  const exportHref = query ? `/api/readings/export?${query}` : "/api/readings/export";

  return (
    <div className="no-print flex items-center gap-2">
      <a href={exportHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <DownloadIcon aria-hidden />
        Export CSV
      </a>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <PrinterIcon aria-hidden />
        Print
      </Button>
    </div>
  );
}
