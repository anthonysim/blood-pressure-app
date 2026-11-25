import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORY_INFO, classify, PERIOD_LABELS } from "@/lib/bp";
import { getReadingsForExport } from "@/lib/data";
import { formatInZone } from "@/lib/dates";
import { parseFilters } from "@/lib/filters";

function csvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filters = parseFilters(request.nextUrl.searchParams);
  const { rows, tz } = await getReadingsForExport(filters);

  const header = ["Date", "Time", "Period", "Systolic (mmHg)", "Diastolic (mmHg)", "Pulse (bpm)", "Category", "Notes"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        formatInZone(r.measuredAt, "yyyy-MM-dd", tz),
        formatInZone(r.measuredAt, "HH:mm", tz),
        PERIOD_LABELS[r.period],
        r.systolic,
        r.diastolic,
        r.pulse ?? "",
        CATEGORY_INFO[classify(r.systolic, r.diastolic)].label,
        r.notes ?? "",
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  const today = formatInZone(new Date(), "yyyy-MM-dd", tz);
  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="blood-pressure-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
