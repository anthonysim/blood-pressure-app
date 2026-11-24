"use client";

import { Trash2Icon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteReading } from "@/app/actions/readings";
import { Button } from "@/components/ui/button";

export function DeleteReadingButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Delete this reading? This can't be undone.")) return;
    startTransition(async () => {
      const { error } = await deleteReading(id);
      if (error) toast.error(error);
      else toast.success("Reading deleted");
    });
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleClick} disabled={isPending} aria-label="Delete reading">
      <Trash2Icon />
    </Button>
  );
}
