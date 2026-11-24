import type { Metadata } from "next";
import { Suspense } from "react";
import { createReading } from "@/app/actions/readings";
import { ReadingForm } from "@/components/reading-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatInZone, getTimeZone } from "@/lib/dates";

export const metadata: Metadata = { title: "Add reading" };

export default function NewReadingPage() {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Add reading</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <NewReadingForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function NewReadingForm() {
  const [, tz] = await Promise.all([requireUser(), getTimeZone()]);
  const now = formatInZone(new Date(), "yyyy-MM-dd'T'HH:mm", tz);
  return <ReadingForm action={createReading} initial={{ measuredAt: now }} submitLabel="Save reading" />;
}
