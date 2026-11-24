import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { updateReading } from "@/app/actions/readings";
import { ReadingForm } from "@/components/reading-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReading } from "@/lib/data";
import { formatInZone } from "@/lib/dates";

export const metadata: Metadata = { title: "Edit reading" };

export default function EditReadingPage({ params }: PageProps<"/readings/[id]/edit">) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Edit reading</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <EditReadingForm params={params} />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function EditReadingForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const result = await getReading(id);
  if (!result) notFound();
  const { row, tz } = result;

  return (
    <ReadingForm
      action={updateReading.bind(null, row.id)}
      submitLabel="Save changes"
      initial={{
        systolic: row.systolic,
        diastolic: row.diastolic,
        pulse: row.pulse,
        period: row.period,
        notes: row.notes,
        measuredAt: formatInZone(row.measuredAt, "yyyy-MM-dd'T'HH:mm", tz),
      }}
    />
  );
}
