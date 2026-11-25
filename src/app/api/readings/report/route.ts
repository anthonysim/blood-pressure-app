import { subDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORY_INFO, PERIOD_LABELS } from "@/lib/bp";
import { getReportData } from "@/lib/data";
import { formatInZone } from "@/lib/dates";
import { parseFilters, type Filters } from "@/lib/filters";
import { buildReportPdf } from "@/lib/report-pdf";

function filterNotes(filters: Filters): string[] {
  const notes: string[] = [];
  if (filters.period.length > 0) notes.push(`Time of day: ${filters.period.map((p) => PERIOD_LABELS[p]).join(", ")}`);
  if (filters.category.length > 0) notes.push(`Category: ${filters.category.map((c) => CATEGORY_INFO[c].label).join(", ")}`);
  const range = (label: string, min?: number, max?: number) => {
    if (min !== undefined && max !== undefined) notes.push(`${label} ${min}-${max} mmHg`);
    else if (min !== undefined) notes.push(`${label} at least ${min} mmHg`);
    else if (max !== undefined) notes.push(`${label} at most ${max} mmHg`);
  };
  range("Systolic", filters.sysMin, filters.sysMax);
  range("Diastolic", filters.diaMin, filters.diaMax);
  if (filters.q) notes.push(`Notes contain "${filters.q}"`);
  return notes;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filters = parseFilters(request.nextUrl.searchParams);
  const { rows, tz, now, bounds, patientName } = await getReportData(filters);

  const dateFmt = "MMM d, yyyy";
  // Open-ended ranges fall back to the oldest/newest reading shown.
  const start = bounds.start ?? rows.at(-1)?.measuredAt ?? now;
  const end = bounds.end ? subDays(bounds.end, 1) : (bounds.start ? now : (rows[0]?.measuredAt ?? now));

  const pdf = await buildReportPdf({
    patientName,
    rangeLabel: `${formatInZone(start, dateFmt, tz)} - ${formatInZone(end, dateFmt, tz)}`,
    filterNotes: filterNotes(filters),
    generatedLabel: formatInZone(now, "MMM d, yyyy h:mm a", tz),
    readings: rows,
    formatDate: (d) => formatInZone(d, "EEE, MMM d, yyyy", tz),
    formatTime: (d) => formatInZone(d, "h:mm a", tz),
  });

  const today = formatInZone(now, "yyyy-MM-dd", tz);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="blood-pressure-report-${today}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
