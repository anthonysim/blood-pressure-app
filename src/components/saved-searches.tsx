"use client";

import { BookmarkPlusIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteSavedSearch, saveSearch } from "@/app/actions/saved-searches";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Saved = { id: string; name: string; query: string };

type Props = {
  basePath: "/readings" | "/trends";
  saved: Saved[];
  /** Canonical query string for the filters currently applied. */
  currentQuery: string;
};

export function SavedSearches({ basePath, saved, currentQuery }: Props) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">Saved searches</span>
      {saved.length === 0 ? (
        <span className="text-sm text-muted-foreground">None yet — apply filters, then save them.</span>
      ) : (
        saved.map((s) => <SavedChip key={s.id} basePath={basePath} search={s} active={s.query === currentQuery} />)
      )}
      <SaveSearchDialog currentQuery={currentQuery} />
    </div>
  );
}

function SavedChip({ basePath, search, active }: { basePath: string; search: Saved; active: boolean }) {
  const [isPending, startTransition] = useTransition();
  const href = search.query ? `${basePath}?${search.query}` : basePath;

  function handleDelete() {
    startTransition(async () => {
      const { error } = await deleteSavedSearch(search.id);
      if (error) toast.error(error);
    });
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border bg-card text-xs transition-opacity",
        active && "border-primary bg-primary/10",
        isPending && "opacity-50",
      )}
    >
      <Link href={href} className="py-1 pr-1 pl-2.5 hover:underline">
        {search.name}
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        aria-label={`Delete saved search ${search.name}`}
        className="rounded-full p-1 text-muted-foreground hover:text-foreground"
      >
        <XIcon className="size-3" />
      </button>
    </span>
  );
}

function SaveSearchDialog({ currentQuery }: { currentQuery: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const name = String(formData.get("name") ?? "");
    startTransition(async () => {
      const result = await saveSearch({ name, query: currentQuery });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setError(null);
      toast.success(`Saved "${name.trim()}"`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="xs" />}>
        <BookmarkPlusIcon aria-hidden />
        Save current
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save this search</DialogTitle>
          <DialogDescription>Give the current filters a name so you can reapply them in one click.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="search-name">Name</Label>
            <Input id="search-name" name="name" required maxLength={60} placeholder="e.g. High mornings, last 90 days" />
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
