// Identifier in format "SourceId-TargetId"
export type IdentifierId = string;

// Monthly consumption data per identifier
export interface MonthlyRecord {
  // Year and month as "YYYY-MM" for easy sorting and comparison
  yearMonth: string;
  // Display label e.g. "duben 2026"
  label: string;
  // Total consumption in kWh per identifier
  consumption: Record<IdentifierId, number>;
}

export interface ParsedFile {
  fileName: string;
  yearMonth: string;
  label: string;
  // Raw row count for conflict comparison
  rowCount: number;
  consumption: Record<IdentifierId, number>;
}

export interface IdentifierAlias {
  id: IdentifierId;
  alias: string;
}

// ViewMode as a const object — TypeScript 6 erasableSyntaxOnly disallows enums
export const ViewMode = {
  List: "list",
  Chart: "chart",
} as const;

export type ViewMode = (typeof ViewMode)[keyof typeof ViewMode];

export interface ConflictInfo {
  fileName: string;
  yearMonth: string;
  existing: ParsedFile;
  incoming: ParsedFile;
  isIdentical: boolean;
}

export const DEFAULT_PRICE_PER_KWH = 1;

export const CZECH_MONTHS = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];
