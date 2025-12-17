import XLSX from "xlsx";
import {
  insertCustomerSchema,
  insertSupplierSchema,
  type InsertCustomer,
  type InsertSupplier,
} from "@shared/schema";

type ImportError = { row: number; message: string };

export type ImportResult = {
  totalRows: number;
  imported: number;
  errors: ImportError[];
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function parseBalanceToCents(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;

  // Allow "1,234.56"
  const cleaned = raw.replace(/,/g, "");

  // If it looks like a decimal amount, treat as major units and convert to cents.
  if (/^-?\d+(\.\d+)?$/.test(cleaned) && cleaned.includes(".")) {
    const amount = Number(cleaned);
    if (!Number.isFinite(amount)) return undefined;
    return Math.round(amount * 100);
  }

  // Otherwise treat as integer cents.
  const cents = Number(cleaned);
  if (!Number.isFinite(cents)) return undefined;
  return Math.trunc(cents);
}

function readRowsFromFile(buffer: Buffer, filename: string) {
  const lower = filename.toLowerCase();
  const workbook =
    lower.endsWith(".csv") || lower.endsWith(".txt")
      ? XLSX.read(buffer.toString("utf8"), { type: "string" })
      : XLSX.read(buffer, { type: "buffer" });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  return { rows, sheetName };
}

function buildHeaderIndex(headerRow: unknown[]): Map<string, number> {
  const index = new Map<string, number>();
  headerRow.forEach((value, i) => {
    const key = normalizeHeader(value);
    if (key) index.set(key, i);
  });
  return index;
}

function getCell(row: unknown[], headerIndex: Map<string, number>, key: string): unknown {
  const idx = headerIndex.get(key);
  if (idx === undefined) return undefined;
  return row[idx];
}

function asOptionalString(value: unknown): string | undefined {
  const s = String(value ?? "").trim();
  return s ? s : undefined;
}

export function parseCustomersImport(buffer: Buffer, filename: string): {
  records: InsertCustomer[];
  result: ImportResult;
} {
  const { rows } = readRowsFromFile(buffer, filename);
  const headerRow = rows[0] ?? [];
  const headerIndex = buildHeaderIndex(headerRow);

  const errors: ImportError[] = [];
  const records: InsertCustomer[] = [];

  // data rows start at index 1; report row numbers as Excel-like (1-based)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rowNumber = i + 1;

    const name = asOptionalString(getCell(row, headerIndex, "name"));
    if (!name) {
      continue;
    }

    const payload: Partial<InsertCustomer> = {
      name,
      phone: asOptionalString(getCell(row, headerIndex, "phone")),
      email: asOptionalString(getCell(row, headerIndex, "email")),
      address: asOptionalString(getCell(row, headerIndex, "address")),
      notes: asOptionalString(getCell(row, headerIndex, "notes")),
      archived: false,
    };

    const balance =
      parseBalanceToCents(getCell(row, headerIndex, "balance")) ??
      parseBalanceToCents(getCell(row, headerIndex, "balance_cents"));
    if (balance !== undefined) payload.balance = balance;

    const parsed = insertCustomerSchema.safeParse(payload);
    if (!parsed.success) {
      errors.push({
        row: rowNumber,
        message: parsed.error.issues.map((iss) => iss.message).join("; "),
      });
      continue;
    }

    records.push(parsed.data);
  }

  return {
    records,
    result: {
      totalRows: Math.max(0, rows.length - 1),
      imported: records.length,
      errors,
    },
  };
}

export function parseSuppliersImport(buffer: Buffer, filename: string): {
  records: InsertSupplier[];
  result: ImportResult;
} {
  const { rows } = readRowsFromFile(buffer, filename);
  const headerRow = rows[0] ?? [];
  const headerIndex = buildHeaderIndex(headerRow);

  const errors: ImportError[] = [];
  const records: InsertSupplier[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rowNumber = i + 1;

    const name = asOptionalString(getCell(row, headerIndex, "name"));
    if (!name) {
      continue;
    }

    const payload: Partial<InsertSupplier> = {
      name,
      phone: asOptionalString(getCell(row, headerIndex, "phone")),
      email: asOptionalString(getCell(row, headerIndex, "email")),
      address: asOptionalString(getCell(row, headerIndex, "address")),
      notes: asOptionalString(getCell(row, headerIndex, "notes")),
      archived: false,
    };

    const balance =
      parseBalanceToCents(getCell(row, headerIndex, "balance")) ??
      parseBalanceToCents(getCell(row, headerIndex, "balance_cents"));
    if (balance !== undefined) payload.balance = balance;

    const parsed = insertSupplierSchema.safeParse(payload);
    if (!parsed.success) {
      errors.push({
        row: rowNumber,
        message: parsed.error.issues.map((iss) => iss.message).join("; "),
      });
      continue;
    }

    records.push(parsed.data);
  }

  return {
    records,
    result: {
      totalRows: Math.max(0, rows.length - 1),
      imported: records.length,
      errors,
    },
  };
}
