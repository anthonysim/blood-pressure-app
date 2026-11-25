import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { CATEGORIES, CATEGORY_INFO, classify, PERIOD_LABELS, PERIODS, type Period } from "./bp";

export type ReportReading = {
  systolic: number;
  diastolic: number;
  pulse: number | null;
  period: Period;
  measuredAt: Date;
  notes: string | null;
};

export type ReportInput = {
  patientName: string;
  /** Human-readable date span, e.g. "Oct 26, 2026 - Nov 24, 2026". */
  rangeLabel: string;
  /** Extra filters applied beyond the date range, already formatted. Empty when none. */
  filterNotes: string[];
  generatedLabel: string;
  /** Newest first. */
  readings: ReportReading[];
  /** Formats a reading's instant in the patient's time zone. */
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
};

/* ---------- Stats (pure, exported for tests) ---------- */

type Avg = { systolic: number; diastolic: number; pulse: number | null; count: number };

function average(rows: ReportReading[]): Avg | null {
  if (rows.length === 0) return null;
  const pulses = rows.filter((r) => r.pulse !== null).map((r) => r.pulse!);
  const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  return {
    systolic: mean(rows.map((r) => r.systolic)),
    diastolic: mean(rows.map((r) => r.diastolic)),
    pulse: pulses.length > 0 ? mean(pulses) : null,
    count: rows.length,
  };
}

export function reportStats(rows: ReportReading[]) {
  const overall = average(rows);
  const byPeriod = PERIODS.map((period) => ({ period, avg: average(rows.filter((r) => r.period === period)) }));
  const byCategory = CATEGORIES.map((category) => ({
    category,
    count: rows.filter((r) => classify(r.systolic, r.diastolic) === category).length,
  }));
  // "Highest"/"lowest" by systolic, diastolic as tiebreaker.
  const sorted = [...rows].sort((a, b) => a.systolic - b.systolic || a.diastolic - b.diastolic);
  return { overall, byPeriod, byCategory, lowest: sorted[0] ?? null, highest: sorted.at(-1) ?? null };
}

/** Standard PDF fonts only encode WinAnsi; replace anything else so drawText never throws. */
export function toWinAnsi(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF]/gu, "?");
}

/* ---------- Layout ---------- */

const PAGE_W = 612; // US Letter
const PAGE_H = 792;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 36;

const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.42, 0.42, 0.46);
const RULE = rgb(0.85, 0.85, 0.88);
const BAND = rgb(0.96, 0.96, 0.97);

type Col = { label: string; width: number; align?: "right"; wrap?: boolean };

const ROW_H = 15;
const LINE_H = 11;
const TEXT_SIZE = 9;
/** Safety cap so one huge note can never outgrow a page. */
const MAX_LINES = 40;

class Writer {
  doc: PDFDocument;
  page!: PDFPage;
  y = 0;
  constructor(
    doc: PDFDocument,
    readonly font: PDFFont,
    readonly bold: PDFFont,
  ) {
    this.doc = doc;
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }

  ensure(height: number) {
    if (this.y - height < MARGIN + FOOTER_H) this.newPage();
  }

  text(str: string, x: number, opts: { size?: number; bold?: boolean; color?: typeof INK; maxWidth?: number; align?: "right" } = {}) {
    const size = opts.size ?? 9;
    const font = opts.bold ? this.bold : this.font;
    let s = toWinAnsi(str);
    if (opts.maxWidth !== undefined) s = fit(s, font, size, opts.maxWidth);
    const w = font.widthOfTextAtSize(s, size);
    const drawX = opts.align === "right" && opts.maxWidth !== undefined ? x + opts.maxWidth - w : x;
    this.page.drawText(s, { x: drawX, y: this.y, size, font, color: opts.color ?? INK });
  }

  heading(str: string) {
    this.ensure(40);
    this.y -= 22;
    this.text(str, MARGIN, { size: 12, bold: true });
    this.y -= 6;
    this.rule();
  }

  rule() {
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_W - MARGIN, y: this.y },
      thickness: 0.75,
      color: RULE,
    });
  }

  tableHeader(cols: Col[]) {
    this.y -= 14;
    let x = MARGIN;
    for (const c of cols) {
      this.text(c.label, x + 4, { size: 8, bold: true, color: MUTED, maxWidth: c.width - 8, align: c.align });
      x += c.width;
    }
    this.y -= 5;
    this.rule();
  }

  /** Each cell as the lines it will draw: wrapped for `wrap` columns, one truncated line otherwise. */
  layoutRow(cols: Col[], cells: string[]): string[][] {
    return cols.map((c, i) => {
      const text = toWinAnsi(cells[i] ?? "");
      return c.wrap ? wrapText(text, this.font, TEXT_SIZE, c.width - 8, MAX_LINES) : [text];
    });
  }

  tableRow(cols: Col[], lines: string[][], shaded: boolean) {
    const extra = Math.max(...lines.map((l) => l.length), 1) - 1;
    const rowH = ROW_H + extra * LINE_H;
    this.y -= ROW_H;
    if (shaded) {
      this.page.drawRectangle({ x: MARGIN, y: this.y - 4 - extra * LINE_H, width: CONTENT_W, height: rowH, color: BAND });
    }
    const top = this.y;
    let x = MARGIN;
    cols.forEach((c, i) => {
      lines[i].forEach((line, n) => {
        this.y = top - n * LINE_H;
        this.text(line, x + 4, { size: TEXT_SIZE, maxWidth: c.width - 8, align: c.align });
      });
      x += c.width;
    });
    this.y = top - extra * LINE_H;
  }

  /** Draws a table, breaking pages as needed and repeating the header. */
  table(cols: Col[], rows: string[][]) {
    this.ensure(14 + 5 + ROW_H);
    this.tableHeader(cols);
    rows.forEach((cells, i) => {
      const lines = this.layoutRow(cols, cells);
      const rowH = ROW_H + (Math.max(...lines.map((l) => l.length), 1) - 1) * LINE_H;
      if (this.y - rowH < MARGIN + FOOTER_H) {
        this.newPage();
        this.tableHeader(cols);
      }
      this.tableRow(cols, lines, i % 2 === 1);
    });
    this.y -= 6;
  }
}

/** Greedy word wrap; words wider than the column are split by character. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number, maxLines = Infinity): string[] {
  const width = (s: string) => font.widthOfTextAtSize(s, size);
  const lines: string[] = [];
  let line = "";
  for (let word of text.split(" ").filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (width(candidate) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    while (width(word) > maxWidth) {
      let n = word.length - 1;
      while (n > 1 && width(word.slice(0, n)) > maxWidth) n--;
      lines.push(word.slice(0, n));
      word = word.slice(n);
    }
    line = word;
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines.length > 0 ? lines : [""];
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = fit(`${kept[maxLines - 1]} ${lines[maxLines]}`, font, size, maxWidth);
  return kept;
}

function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (font.widthOfTextAtSize(text.slice(0, mid) + "...", size) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + "...";
}

const bp = (s: number, d: number) => `${s}/${d}`;

export async function buildReportPdf(input: ReportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(toWinAnsi(`Blood Pressure Report - ${input.patientName}`));
  doc.setSubject("Home blood pressure readings");
  doc.setCreator("Blood Pressure App");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold);
  const stats = reportStats(input.readings);

  /* Title block */
  w.y -= 6;
  w.text("Blood Pressure Report", MARGIN, { size: 18, bold: true });
  w.y -= 20;
  const meta: [string, string][] = [
    ["Patient", input.patientName],
    ["Dates", input.rangeLabel],
    ["Readings", String(input.readings.length)],
    ["Generated", input.generatedLabel],
    ...input.filterNotes.map((n): [string, string] => ["Filter", n]),
  ];
  for (const [k, v] of meta) {
    w.text(k, MARGIN, { size: 9, color: MUTED });
    w.text(v, MARGIN + 64, { size: 9, maxWidth: CONTENT_W - 64 });
    w.y -= 13;
  }

  /* Summary */
  w.heading("Summary");
  if (stats.overall) {
    const o = stats.overall;
    const cat = CATEGORY_INFO[classify(o.systolic, o.diastolic)].label;
    const cards: [string, string, string][] = [
      ["Average BP", `${bp(o.systolic, o.diastolic)} mmHg`, cat],
      ["Average pulse", o.pulse !== null ? `${o.pulse} bpm` : "-", ""],
      [
        "Highest",
        stats.highest ? `${bp(stats.highest.systolic, stats.highest.diastolic)} mmHg` : "-",
        stats.highest ? `${input.formatDate(stats.highest.measuredAt)}` : "",
      ],
      [
        "Lowest",
        stats.lowest ? `${bp(stats.lowest.systolic, stats.lowest.diastolic)} mmHg` : "-",
        stats.lowest ? `${input.formatDate(stats.lowest.measuredAt)}` : "",
      ],
    ];
    const cardW = CONTENT_W / cards.length;
    w.y -= 16;
    cards.forEach(([label], i) => w.text(label, MARGIN + i * cardW, { size: 8, color: MUTED, maxWidth: cardW - 8 }));
    w.y -= 16;
    cards.forEach(([, value], i) => w.text(value, MARGIN + i * cardW, { size: 13, bold: true, maxWidth: cardW - 8 }));
    w.y -= 13;
    cards.forEach(([, , sub], i) => w.text(sub, MARGIN + i * cardW, { size: 8, color: MUTED, maxWidth: cardW - 8 }));
    w.y -= 4;
  }

  /* Time of day */
  w.heading("By time of day");
  w.table(
    [
      { label: "Period", width: 160 },
      { label: "Readings", width: 100, align: "right" },
      { label: "Average BP (mmHg)", width: 128, align: "right" },
      { label: "Average pulse (bpm)", width: CONTENT_W - 388, align: "right" },
    ],
    stats.byPeriod.map(({ period, avg }) => [
      PERIOD_LABELS[period],
      String(avg?.count ?? 0),
      avg ? bp(avg.systolic, avg.diastolic) : "-",
      avg?.pulse != null ? String(avg.pulse) : "-",
    ]),
  );

  /* Categories */
  w.heading("By category (AHA)");
  const total = input.readings.length;
  w.table(
    [
      { label: "Category", width: 160 },
      { label: "Readings", width: 100, align: "right" },
      { label: "Share", width: 128, align: "right" },
    ],
    stats.byCategory.map(({ category, count }) => [
      CATEGORY_INFO[category].label,
      String(count),
      total > 0 ? `${Math.round((count / total) * 100)}%` : "-",
    ]),
  );

  /* All readings */
  w.heading("All readings");
  w.table(
    [
      { label: "Date", width: 88 },
      { label: "Time", width: 54 },
      { label: "Period", width: 54 },
      { label: "BP (mmHg)", width: 64, align: "right" },
      { label: "Pulse", width: 44, align: "right" },
      { label: "Category", width: 62 },
      { label: "Notes", width: CONTENT_W - 366, wrap: true },
    ],
    input.readings.map((r) => [
      input.formatDate(r.measuredAt),
      input.formatTime(r.measuredAt),
      PERIOD_LABELS[r.period],
      bp(r.systolic, r.diastolic),
      r.pulse !== null ? String(r.pulse) : "-",
      CATEGORY_INFO[classify(r.systolic, r.diastolic)].label,
      r.notes ?? "",
    ]),
  );

  /* Footers */
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const footerY = MARGIN - 6;
    const left = toWinAnsi(`${input.patientName} - Home blood pressure readings. Categories per AHA guidelines; not a diagnosis.`);
    page.drawText(fit(left, font, 7, CONTENT_W - 70), { x: MARGIN, y: footerY, size: 7, font, color: MUTED });
    const right = `Page ${i + 1} of ${pages.length}`;
    page.drawText(right, {
      x: PAGE_W - MARGIN - font.widthOfTextAtSize(right, 7),
      y: footerY,
      size: 7,
      font,
      color: MUTED,
    });
  });

  return doc.save();
}
