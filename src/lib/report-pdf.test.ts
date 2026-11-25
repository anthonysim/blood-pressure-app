import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildReportPdf, reportStats, toWinAnsi, wrapText, type ReportReading } from "./report-pdf";

const r = (systolic: number, diastolic: number, period: ReportReading["period"], pulse: number | null = 70, notes: string | null = null): ReportReading => ({
  systolic,
  diastolic,
  pulse,
  period,
  measuredAt: new Date("2026-11-20T08:00:00Z"),
  notes,
});

describe("reportStats", () => {
  it("averages, splits by period and category, finds extremes", () => {
    const s = reportStats([r(118, 76, "morning"), r(132, 84, "night", null), r(145, 92, "night", 80)]);
    expect(s.overall).toEqual({ systolic: 132, diastolic: 84, pulse: 75, count: 3 });
    expect(s.byPeriod.find((p) => p.period === "noon")?.avg).toBeNull();
    expect(s.byPeriod.find((p) => p.period === "night")?.avg).toMatchObject({ systolic: 139, diastolic: 88, pulse: 80, count: 2 });
    expect(Object.fromEntries(s.byCategory.map((c) => [c.category, c.count]))).toEqual({ normal: 1, elevated: 0, stage1: 1, stage2: 1, crisis: 0 });
    expect(s.highest?.systolic).toBe(145);
    expect(s.lowest?.systolic).toBe(118);
  });

  it("handles no readings", () => {
    const s = reportStats([]);
    expect(s.overall).toBeNull();
    expect(s.highest).toBeNull();
  });
});

describe("toWinAnsi", () => {
  it("normalizes punctuation and replaces unencodable characters", () => {
    expect(toWinAnsi("“dizzy” – felt\nok… 😵 café")).toBe('"dizzy" - felt ok... ? café');
  });
});

describe("wrapText", () => {
  it("wraps on word boundaries, splits overlong words, caps lines", async () => {
    const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    const within = (lines: string[]) => lines.every((l) => font.widthOfTextAtSize(l, 9) <= 100);

    const words = wrapText("Felt a little dizzy after coffee, took meds late this morning", font, 9, 100);
    expect(words.length).toBeGreaterThan(1);
    expect(words.join(" ")).toBe("Felt a little dizzy after coffee, took meds late this morning");
    expect(within(words)).toBe(true);

    const long = wrapText("x".repeat(200), font, 9, 100);
    expect(long.join("")).toBe("x".repeat(200));
    expect(within(long)).toBe(true);

    const capped = wrapText("word ".repeat(200), font, 9, 100, 3);
    expect(capped).toHaveLength(3);
    expect(capped[2].endsWith("...")).toBe(true);

    expect(wrapText("", font, 9, 100)).toEqual([""]);
  });
});

describe("buildReportPdf", () => {
  it("paginates long reports and survives emoji/unicode notes", async () => {
    const readings = Array.from({ length: 150 }, (_, i) => r(110 + (i % 60), 70 + (i % 40), i % 2 ? "morning" : "night", 70, i === 3 ? "头晕 😵 after coffee" : i % 5 === 0 ? "long note ".repeat(50) : null));
    const bytes = await buildReportPdf({
      patientName: "Test Patient",
      rangeLabel: "Oct 26, 2026 - Nov 24, 2026",
      filterNotes: ["Time of day: Morning"],
      generatedLabel: "Nov 24, 2026 9:00 AM",
      readings,
      formatDate: (d) => d.toISOString().slice(0, 10),
      formatTime: () => "8:00 AM",
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(2);
  });
});
