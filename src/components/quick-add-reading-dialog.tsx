"use client";

import { PlusIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { createReading } from "@/app/actions/readings";
import { ReadingForm } from "@/components/reading-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Period } from "@/lib/bp";

function localDateTimeNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  defaultPeriod?: Period;
  triggerLabel?: string;
  compactTrigger?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "xs";
};

export function QuickAddReadingDialog({
  defaultPeriod,
  triggerLabel = "Add reading",
  compactTrigger = false,
  variant = "default",
  size = "sm",
}: Props) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [measuredAt, setMeasuredAt] = useState("");

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setMeasuredAt(localDateTimeNow());
      setFormKey((k) => k + 1);
    }
    setOpen(nextOpen);
  }

  const handleSuccess = useCallback(() => {
    setOpen(false);
    toast.success("Reading saved");
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant={variant} size={size} />}>
        <PlusIcon aria-hidden />
        <span className={compactTrigger ? "hidden sm:inline" : undefined}>{triggerLabel}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add reading</DialogTitle>
          <DialogDescription>Log your systolic, diastolic, and optional pulse.</DialogDescription>
        </DialogHeader>
        {open ? (
          <ReadingForm
            key={formKey}
            action={createReading}
            initial={{ measuredAt, period: defaultPeriod }}
            submitLabel="Save reading"
            noRedirect
            onSuccess={handleSuccess}
            onCancel={() => setOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
