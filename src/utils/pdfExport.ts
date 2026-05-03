import { type ParsedFile, type IdentifierAlias, type IdentifierId } from "../types";
import { formatYearMonthLabel } from "./csvParser";

// jsPDF is loaded from CDN in index.html — augment window type
declare global {
  interface Window {
    jspdf: { jsPDF: new (...args: unknown[]) => JsPDFInstance };
  }
}

interface JsPDFInstance {
  setFont(font: string, style?: string): void;
  setFontSize(size: number): void;
  setTextColor(r: number, g: number, b: number): void;
  text(text: string, x: number, y: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  setDrawColor(r: number, g: number, b: number): void;
  setFillColor(r: number, g: number, b: number): void;
  rect(x: number, y: number, w: number, h: number, style?: string): void;
  save(filename: string): void;
  internal: { pageSize: { getWidth(): number; getHeight(): number } };
  addPage(): void;
  setLineWidth(w: number): void;
}

const PAGE_MARGIN = 20;
const LINE_HEIGHT = 7;
const TABLE_HEADER_HEIGHT = 9;
const TABLE_ROW_HEIGHT = 7;

function resolveLabel(id: IdentifierId, aliases: IdentifierAlias[]): string {
  const found = aliases.find(a => a.id === id);
  return found?.alias.trim() || id;
}

function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals).replace(".", ",");
}

function sortedYearMonths(files: ParsedFile[]): string[] {
  const months = [...new Set(files.map(f => f.yearMonth))];
  return months.sort();
}

function fillMissingMonths(start: string, end: string): string[] {
  const result: string[] = [];
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);

  let y = startYear;
  let m = startMonth;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }

  return result;
}

export function exportToPDF(
  identifierId: IdentifierId,
  files: ParsedFile[],
  aliases: IdentifierAlias[],
  pricePerKwh: number,
): void {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  // Collect files that contain this identifier
  const relevantFiles = files.filter(f => identifierId in f.consumption);
  const sortedMonths = sortedYearMonths(relevantFiles);

  if (sortedMonths.length === 0) {
    alert("Žádná data pro tento identifikátor.");
    return;
  }

  const allMonths = fillMissingMonths(sortedMonths[0], sortedMonths[sortedMonths.length - 1]);

  // Build lookup: yearMonth -> consumption
  const consumptionByMonth: Record<string, number | null> = {};
  for (const ym of allMonths) {
    const file = relevantFiles.find(f => f.yearMonth === ym);
    consumptionByMonth[ym] = file ? (file.consumption[identifierId] ?? null) : null;
  }

  const label = resolveLabel(identifierId, aliases);
  const periodStart = formatPeriodDate(sortedMonths[0], "start");
  const periodEnd = formatPeriodDate(sortedMonths[sortedMonths.length - 1], "end");

  let y = PAGE_MARGIN;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(`Spotřeba energie ${label}`, PAGE_MARGIN, y);
  y += LINE_HEIGHT + 2;

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(`pro období ${periodStart} – ${periodEnd}`, PAGE_MARGIN, y);
  y += LINE_HEIGHT + 6;

  // Horizontal rule
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + contentWidth, y);
  y += 6;

  // Table header
  const colWidths = [50, 70, 70];
  const colX = [PAGE_MARGIN, PAGE_MARGIN + colWidths[0], PAGE_MARGIN + colWidths[0] + colWidths[1]];

  doc.setFillColor(240, 240, 245);
  doc.rect(PAGE_MARGIN, y - 5, contentWidth, TABLE_HEADER_HEIGHT, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text("Měsíc", colX[0] + 2, y);
  doc.text("Spotřeba [kWh]", colX[1] + 2, y);
  doc.text("Cena [Kč]", colX[2] + 2, y);
  y += TABLE_HEADER_HEIGHT - 2;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  let totalConsumption = 0;
  let rowIndex = 0;

  for (const ym of allMonths) {
    const value = consumptionByMonth[ym];
    const monthLabel = formatYearMonthLabel(ym);
    const consumptionText = value !== null ? formatNumber(value) : "Neuvedeno";
    const priceText = value !== null ? formatNumber(value * pricePerKwh) : "Neuvedeno";

    if (value !== null) totalConsumption += value;

    // Alternating row background
    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(PAGE_MARGIN, y - 4.5, contentWidth, TABLE_ROW_HEIGHT, "F");
    }

    doc.setTextColor(value !== null ? 30 : 150, value !== null ? 30 : 150, value !== null ? 30 : 150);
    doc.text(monthLabel, colX[0] + 2, y);
    doc.text(consumptionText, colX[1] + 2, y);
    doc.text(priceText, colX[2] + 2, y);

    y += TABLE_ROW_HEIGHT;
    rowIndex++;

    // Page break guard
    if (y > doc.internal.pageSize.getHeight() - PAGE_MARGIN - 30) {
      doc.addPage();
      y = PAGE_MARGIN + 10;
    }
  }

  y += 4;

  // Price note
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`* Cena vypočtena při sazbě ${formatNumber(pricePerKwh)} Kč/kWh.`, PAGE_MARGIN, y);
  y += LINE_HEIGHT + 4;

  // Horizontal rule before summary
  doc.setDrawColor(200, 200, 200);
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + contentWidth, y);
  y += 6;

  // Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text("Souhrn", PAGE_MARGIN, y);
  y += LINE_HEIGHT;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Celková spotřeba: ${formatNumber(totalConsumption)} kWh`, PAGE_MARGIN, y);
  y += LINE_HEIGHT;
  doc.text(`Celková cena: ${formatNumber(totalConsumption * pricePerKwh)} Kč`, PAGE_MARGIN, y);

  const safeLabel = label.replace(/[^a-zA-Z0-9_\-]/g, "_");
  doc.save(`spotreba_energie_${safeLabel}.pdf`);
}

function formatPeriodDate(yearMonth: string, edge: "start" | "end"): string {
  const [year, month] = yearMonth.split("-").map(Number);
  // Last day of month for "end"
  const day = edge === "start" ? 1 : new Date(year, month, 0).getDate();
  return `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
}
