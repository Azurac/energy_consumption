import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { type ParsedFile, type IdentifierAlias, type IdentifierId } from "../types";
import { formatYearMonthLabel } from "./csvParser";

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
// pdf-lib uses points (1 pt = 1/72 inch, 1 mm = 2.8346 pt)
const MM_TO_PT = 2.8346;

const PAGE_WIDTH = PAGE_WIDTH_MM * MM_TO_PT;
const PAGE_HEIGHT = PAGE_HEIGHT_MM * MM_TO_PT;
const MARGIN = 20 * MM_TO_PT;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Row and line metrics in points
const TITLE_SIZE = 16;
const SUBTITLE_SIZE = 11;
const HEADER_SIZE = 9;
const ROW_SIZE = 9;
const NOTE_SIZE = 7;
const SUMMARY_LABEL_SIZE = 11;
const SUMMARY_ROW_SIZE = 10;
const LINE_GAP = 5;
const ROW_HEIGHT = 14;
const HEADER_HEIGHT = 16;

// Column X positions in points
const COL_MONTH_X = MARGIN;
const COL_KWH_X = MARGIN + 140;
const COL_PRICE_X = MARGIN + 310;

// Colors (pdf-lib uses 0–1 range)
const COLOR_DARK = rgb(0.078, 0.078, 0.078);
const COLOR_MUTED = rgb(0.31, 0.31, 0.31);
const COLOR_GRAY = rgb(0.47, 0.47, 0.47);
const COLOR_ROW_ALT = rgb(0.98, 0.98, 0.99);
const COLOR_HEADER_BG = rgb(0.941, 0.941, 0.961);
const COLOR_RULE = rgb(0.784, 0.784, 0.784);

interface Fonts {
  regular: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  italic: Awaited<ReturnType<PDFDocument["embedFont"]>>;
}

async function fetchFontBytes(filename: string): Promise<ArrayBuffer> {
  const res = await fetch(`/fonts/${filename}`);
  if (!res.ok) throw new Error(`Font fetch failed: ${filename} (${res.status})`);
  return res.arrayBuffer();
}

async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  const [regBuf, boldBuf, italicBuf] = await Promise.all([
    fetchFontBytes("LiberationSans-Regular.ttf"),
    fetchFontBytes("LiberationSans-Bold.ttf"),
    fetchFontBytes("LiberationSans-Italic.ttf"),
  ]);
  return {
    regular: await doc.embedFont(regBuf),
    bold: await doc.embedFont(boldBuf),
    italic: await doc.embedFont(italicBuf),
  };
}

function resolveLabel(id: IdentifierId, aliases: IdentifierAlias[]): string {
  return aliases.find(a => a.id === id)?.alias.trim() || id;
}

function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals).replace(".", ",");
}

function sortedYearMonths(files: ParsedFile[]): string[] {
  return [...new Set(files.map(f => f.yearMonth))].sort();
}

function fillMissingMonths(start: string, end: string): string[] {
  const result: string[] = [];
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  let y = sy; let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    if (++m > 12) { m = 1; y++; }
  }
  return result;
}

function formatPeriodDate(yearMonth: string, edge: "start" | "end"): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const day = edge === "start" ? 1 : new Date(year, month, 0).getDate();
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
}

// Draw a horizontal rule at the given Y coordinate (in PDF space, Y grows upward)
function drawRule(page: ReturnType<PDFDocument["addPage"]>, y: number) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_WIDTH, y },
    thickness: 0.5,
    color: COLOR_RULE,
  });
}

export async function exportToPDF(
  identifierId: IdentifierId,
  files: ParsedFile[],
  aliases: IdentifierAlias[],
  pricePerKwh: number,
): Promise<void> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const fonts = await loadFonts(doc);

  const relevantFiles = files.filter(f => identifierId in f.consumption);
  const sortedMonths = sortedYearMonths(relevantFiles);

  if (sortedMonths.length === 0) {
    alert("Žádná data pro tento identifikátor.");
    return;
  }

  const allMonths = fillMissingMonths(sortedMonths[0], sortedMonths[sortedMonths.length - 1]);

  const consumptionByMonth: Record<string, number | null> = {};
  for (const ym of allMonths) {
    const f = relevantFiles.find(f => f.yearMonth === ym);
    consumptionByMonth[ym] = f ? (f.consumption[identifierId] ?? null) : null;
  }

  const label = resolveLabel(identifierId, aliases);
  const periodStart = formatPeriodDate(sortedMonths[0], "start");
  const periodEnd = formatPeriodDate(sortedMonths[sortedMonths.length - 1], "end");

  // pdf-lib Y axis: 0 = bottom, PAGE_HEIGHT = top — we track cursor from top
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN; // current top cursor

  // Helper: advance cursor and add new page if needed
  function ensureSpace(needed: number) {
    if (y - needed < MARGIN + 40) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  // Title — centered
  const titleText = `Spotřeba energie ${label}`;
  const titleWidth = fonts.bold.widthOfTextAtSize(titleText, TITLE_SIZE);
  page.drawText(titleText, {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y,
    size: TITLE_SIZE,
    font: fonts.bold,
    color: COLOR_DARK,
  });
  y -= TITLE_SIZE + LINE_GAP + 2;

  // Subtitle — centered
  const subtitleText = `pro období ${periodStart} – ${periodEnd}`;
  const subtitleWidth = fonts.regular.widthOfTextAtSize(subtitleText, SUBTITLE_SIZE);
  page.drawText(subtitleText, {
    x: (PAGE_WIDTH - subtitleWidth) / 2,
    y,
    size: SUBTITLE_SIZE,
    font: fonts.regular,
    color: COLOR_MUTED,
  });
  y -= SUBTITLE_SIZE + LINE_GAP + 8;

  drawRule(page, y);
  y -= 10;

  // Table header background
  ensureSpace(HEADER_HEIGHT + ROW_HEIGHT);
  page.drawRectangle({
    x: MARGIN,
    y: y - HEADER_HEIGHT + 4,
    width: CONTENT_WIDTH,
    height: HEADER_HEIGHT,
    color: COLOR_HEADER_BG,
  });

  page.drawText("Měsíc", { x: COL_MONTH_X + 4, y, size: HEADER_SIZE, font: fonts.bold, color: COLOR_DARK });
  page.drawText("Spotřeba [kWh]", { x: COL_KWH_X + 4, y, size: HEADER_SIZE, font: fonts.bold, color: COLOR_DARK });
  page.drawText("Cena [Kč]", { x: COL_PRICE_X + 4, y, size: HEADER_SIZE, font: fonts.bold, color: COLOR_DARK });
  y -= HEADER_HEIGHT;

  // Table rows
  let totalConsumption = 0;
  let rowIndex = 0;

  for (const ym of allMonths) {
    ensureSpace(ROW_HEIGHT);

    const value = consumptionByMonth[ym];
    if (value !== null) totalConsumption += value;

    // Alternating row background
    if (rowIndex % 2 === 0) {
      page.drawRectangle({
        x: MARGIN,
        y: y - ROW_HEIGHT + 4,
        width: CONTENT_WIDTH,
        height: ROW_HEIGHT,
        color: COLOR_ROW_ALT,
      });
    }

    const textColor = value !== null ? COLOR_DARK : COLOR_GRAY;
    const monthLabel = formatYearMonthLabel(ym);
    const kwhText = value !== null ? formatNumber(value) : "Neuvedeno";
    const priceText = value !== null ? formatNumber(value * pricePerKwh) : "Neuvedeno";

    page.drawText(monthLabel, { x: COL_MONTH_X + 4, y, size: ROW_SIZE, font: fonts.regular, color: textColor });
    page.drawText(kwhText, { x: COL_KWH_X + 4, y, size: ROW_SIZE, font: fonts.regular, color: textColor });
    page.drawText(priceText, { x: COL_PRICE_X + 4, y, size: ROW_SIZE, font: fonts.regular, color: textColor });

    y -= ROW_HEIGHT;
    rowIndex++;
  }

  y -= 6;
  ensureSpace(NOTE_SIZE + LINE_GAP + 40);

  // Price note
  page.drawText(
    `* Cena vypočtena při sazbě ${formatNumber(pricePerKwh)} Kč/kWh.`,
    { x: MARGIN, y, size: NOTE_SIZE, font: fonts.italic, color: COLOR_GRAY },
  );
  y -= NOTE_SIZE + LINE_GAP + 8;

  drawRule(page, y);
  y -= 12;

  // Summary heading
  page.drawText("Souhrn", { x: MARGIN, y, size: SUMMARY_LABEL_SIZE, font: fonts.bold, color: COLOR_DARK });
  y -= SUMMARY_LABEL_SIZE + LINE_GAP;

  page.drawText(
    `Celková spotřeba: ${formatNumber(totalConsumption)} kWh`,
    { x: MARGIN, y, size: SUMMARY_ROW_SIZE, font: fonts.regular, color: COLOR_DARK },
  );
  y -= SUMMARY_ROW_SIZE + LINE_GAP;

  page.drawText(
    `Celková cena: ${formatNumber(totalConsumption * pricePerKwh)} Kč`,
    { x: MARGIN, y, size: SUMMARY_ROW_SIZE, font: fonts.regular, color: COLOR_DARK },
  );

  // Trigger browser download
  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, "_");
  a.href = url;
  a.download = `spotreba_energie_${safeLabel}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
