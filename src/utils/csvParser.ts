import { type ParsedFile, CZECH_MONTHS } from "../types";

const COLUMN_DATUM = 0;
const COLUMN_CAS_OD = 1;
const COLUMN_CAS_DO = 2;
const FIRST_IDENTIFIER_COLUMN = 3;

function parseDate(raw: string): Date | null {
  // Expected format: DD.MM.YYYY
  const parts = raw.trim().split(".");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

function parseDecimal(raw: string): number {
  // Czech decimal separator is comma
  return parseFloat(raw.trim().replace(",", "."));
}

export function buildYearMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function buildLabel(year: number, month: number): string {
  return `${CZECH_MONTHS[month]} ${year}`;
}

export function formatYearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return buildLabel(year, month - 1);
}

export function parseCSV(fileName: string, content: string): ParsedFile {
  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    throw new Error(`Soubor "${fileName}" je prázdný.`);
  }

  // Detect if first line is a header (non-numeric first column)
  let dataLines = lines;
  const firstCells = lines[0].split(";");
  if (firstCells.length > 0 && isNaN(Number(firstCells[COLUMN_DATUM].split(".")[0]))) {
    dataLines = lines.slice(1);
  }

  if (dataLines.length === 0) {
    throw new Error(`Soubor "${fileName}" neobsahuje datové řádky.`);
  }

  // Detect identifier columns from the first data row
  const firstRow = dataLines[0].split(";");
  const identifierCount = firstRow.length - FIRST_IDENTIFIER_COLUMN;
  if (identifierCount <= 0) {
    throw new Error(`Soubor "${fileName}" neobsahuje sloupce identifikátorů.`);
  }

  // Collect identifier names — we derive them from header if present, else use column index
  let identifierIds: string[];
  if (lines.length !== dataLines.length) {
    // Header row exists
    const headerCells = lines[0].split(";");
    identifierIds = headerCells.slice(FIRST_IDENTIFIER_COLUMN).map(h => h.trim());
  } else {
    identifierIds = Array.from({ length: identifierCount }, (_, i) => `col_${i + FIRST_IDENTIFIER_COLUMN}`);
  }

  const consumption: Record<string, number> = {};
  identifierIds.forEach(id => { consumption[id] = 0; });

  let detectedYear: number | null = null;
  let detectedMonth: number | null = null;

  for (const line of dataLines) {
    const cells = line.split(";");
    if (cells.length < FIRST_IDENTIFIER_COLUMN + 1) continue;

    const date = parseDate(cells[COLUMN_DATUM]);
    if (!date) continue;

    // Use the first successfully parsed date to determine year/month
    if (detectedYear === null) {
      detectedYear = date.getFullYear();
      detectedMonth = date.getMonth();
    }

    // Ignore rows with time columns (COLUMN_CAS_OD, COLUMN_CAS_DO) — they are metadata
    void cells[COLUMN_CAS_OD];
    void cells[COLUMN_CAS_DO];

    for (let i = 0; i < identifierIds.length; i++) {
      const rawValue = cells[FIRST_IDENTIFIER_COLUMN + i];
      if (rawValue === undefined || rawValue.trim() === "") continue;
      const value = parseDecimal(rawValue);
      if (!isNaN(value)) {
        consumption[identifierIds[i]] += value;
      }
    }
  }

  if (detectedYear === null || detectedMonth === null) {
    throw new Error(`Soubor "${fileName}" neobsahuje platná data.`);
  }

  return {
    fileName,
    yearMonth: buildYearMonth(detectedYear, detectedMonth),
    label: buildLabel(detectedYear, detectedMonth),
    rowCount: dataLines.length,
    consumption,
  };
}

export function filesAreIdentical(a: ParsedFile, b: ParsedFile): boolean {
  const keysA = Object.keys(a.consumption).sort();
  const keysB = Object.keys(b.consumption).sort();
  if (keysA.join(",") !== keysB.join(",")) return false;
  return keysA.every(k => a.consumption[k] === b.consumption[k]);
}
