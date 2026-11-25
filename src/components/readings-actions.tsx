"use client";

import { DownloadIcon, Loader2Icon, PrinterIcon, SendIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";

const SHARE_TITLE = "Blood pressure report";
const SHARE_TEXT = "Hi, attached is my home blood pressure report (PDF).";

function filenameFrom(res: Response): string {
  const match = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "");
  return match?.[1] ?? "blood-pressure-report.pdf";
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Fallback when the browser can't share files: save the PDF and open an email draft to attach it to. */
function downloadAndDraftEmail(file: File) {
  download(file);
  const subject = encodeURIComponent(SHARE_TITLE);
  const body = encodeURIComponent(`${SHARE_TEXT}\n\n(Attach the downloaded file: ${file.name})`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  toast.success("Report downloaded", { description: "Attach it to the email draft that just opened." });
}

async function share(file: File): Promise<void> {
  try {
    await navigator.share({ files: [file], title: SHARE_TITLE, text: SHARE_TEXT });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return; // user closed the sheet
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      // Generating took too long and the browser dropped the click's user activation; a fresh tap fixes it.
      toast("Report ready", { action: { label: "Share", onClick: () => void share(file) } });
      return;
    }
    downloadAndDraftEmail(file);
  }
}

type UAData = { brands?: { brand: string }[]; mobile?: boolean };

/** Only desktop Chromium reliably prints a PDF loaded in a hidden iframe. */
function canPrintPdfInFrame(): boolean {
  const ua = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
  return !!ua && !ua.mobile && !!ua.brands?.some((b) => b.brand === "Chromium");
}

let printFrame: HTMLIFrameElement | null = null;

/** Opens the print dialog for the report PDF; resolves once the dialog was requested. */
function printPdfInFrame(href: string): Promise<void> {
  printFrame?.remove();
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  printFrame = frame;
  return new Promise((resolve, reject) => {
    frame.onload = () => {
      // Give the PDF viewer a moment to render before printing.
      setTimeout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 300);
    };
    frame.onerror = () => reject(new Error("load failed"));
    frame.src = href;
    document.body.appendChild(frame);
  });
}

export function ReadingsActions({ query }: { query: string }) {
  const [sending, setSending] = useState(false);
  const [printing, setPrinting] = useState(false);
  const exportHref = query ? `/api/readings/export?${query}` : "/api/readings/export";
  const reportHref = query ? `/api/readings/report?${query}` : "/api/readings/report";

  async function sendToDoctor() {
    setSending(true);
    try {
      const res = await fetch(reportHref, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const file = new File([await res.blob()], filenameFrom(res), { type: "application/pdf" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await share(file);
      } else {
        downloadAndDraftEmail(file);
      }
    } catch {
      toast.error("Couldn't create the report. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function printReport() {
    if (!canPrintPdfInFrame()) {
      // Opened synchronously from the click so popup blockers allow it; print from the PDF viewer.
      window.open(reportHref, "_blank", "noopener");
      return;
    }
    setPrinting(true);
    try {
      await printPdfInFrame(reportHref);
    } catch {
      toast.error("Couldn't open the print dialog.", {
        action: { label: "Open PDF", onClick: () => window.open(reportHref, "_blank", "noopener") },
      });
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <a href={exportHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <DownloadIcon aria-hidden />
        Export CSV
      </a>
      <Button variant="outline" size="sm" onClick={printReport} disabled={printing}>
        {printing ? <Loader2Icon aria-hidden className="animate-spin" /> : <PrinterIcon aria-hidden />}
        Print
      </Button>
      <Button size="sm" onClick={sendToDoctor} disabled={sending}>
        {sending ? <Loader2Icon aria-hidden className="animate-spin" /> : <SendIcon aria-hidden />}
        Send
      </Button>
    </div>
  );
}
