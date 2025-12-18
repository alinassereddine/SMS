import XLSX from "xlsx";
import {
  insertProductSchema,
  insertCustomerSchema,
  insertSupplierSchema,
  insertPurchaseInvoiceSchema,
  insertSaleSchema,
  insertPaymentSchema,
  insertExpenseSchema,
  type InsertPurchaseInvoice,
  type InsertSale,
  type InsertPayment,
  type InsertExpense,
  type InsertProduct,
  type InsertCustomer,
  type InsertSupplier,
} from "@shared/schema";

type ImportError = { row: number; message: string };

export type ImportResult = {
  totalRows: number;
  imported: number;
  errors: ImportError[];
};

type PurchaseImportRow = {
  invoiceNumber: string;
  supplier: string;
  date?: string;
  discountAmount?: number;
  paidAmount?: number;
  notes?: string;
  product: string;
  imei: string;
  unitPrice: number;
};

type PurchaseImportInvoice = {
  invoiceNumber: string;
  supplier: string;
  date?: string;
  discountAmount?: number;
  paidAmount?: number;
  notes?: string;
  items: { product: string; imei: string; unitPrice: number }[];
};

type SaleImportRow = {
  saleNumber: string;
  customer?: string;
  date?: string;
  discountAmount?: number;
  paidAmount?: number;
  paymentMethod?: string;
  notes?: string;
  imei: string;
  unitPrice: number;
};

type SaleImportSale = {
  saleNumber: string;
  customer?: string;
  date?: string;
  discountAmount?: number;
  paidAmount?: number;
  paymentMethod?: string;
  notes?: string;
  items: { imei: string; unitPrice: number }[];
};

export function parseExpensesImport(buffer: Buffer, filename: string): {
  records: InsertExpense[];
  result: ImportResult;
} {
  const { rows } = readRowsFromFile(buffer, filename);
  const headerRow = rows[0] ?? [];
  const headerIndex = buildHeaderIndex(headerRow);

  const errors: ImportError[] = [];
  const records: InsertExpense[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rowNumber = i + 1;

    const description = asRequiredString(getCell(row, headerIndex, "description"));
    const category = asRequiredString(getCell(row, headerIndex, "category"));
    const amount = parseMoneyToCents(getCell(row, headerIndex, "amount"));
    const paymentMethod = asOptionalString(getCell(row, headerIndex, "paymentmethod")) ?? "cash";
    const date = asOptionalString(getCell(row, headerIndex, "date"));
    const reference = asOptionalString(getCell(row, headerIndex, "reference"));
    const notes = asOptionalString(getCell(row, headerIndex, "notes"));

    if (!description) {
      errors.push({ row: rowNumber, message: "Description is required" });
      continue;
    }
    if (!category) {
      errors.push({ row: rowNumber, message: "Category is required" });
      continue;
    }
    if (amount === undefined) {
      errors.push({ row: rowNumber, message: "Amount is required" });
      continue;
    }

    const payload: Partial<InsertExpense> = {
      description,
      category,
      amount,
      paymentMethod: paymentMethod as any,
      reference,
      notes,
      cashRegisterSessionId: null,
      createdBy: null,
      archived: false,
    };

    if (date) payload.date = new Date(date);

    const parsed = insertExpenseSchema.safeParse(payload);
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

function parseSpecificationsObject(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input)
      .map(([k, v]) => [k, asOptionalString(v)])
      .filter(([, v]) => v !== undefined),
  );
}

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

function parseMoneyToCents(value: unknown): number | undefined {
  return parseBalanceToCents(value);
}

function asRequiredString(value: unknown): string | undefined {
  const s = String(value ?? "").trim();
  return s ? s : undefined;
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

export function parsePaymentsImport(buffer: Buffer, filename: string): {
  records: InsertPayment[];
  result: ImportResult;
} {
  const { rows } = readRowsFromFile(buffer, filename);
  const headerRow = rows[0] ?? [];
  const headerIndex = buildHeaderIndex(headerRow);

  const errors: ImportError[] = [];
  const records: InsertPayment[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rowNumber = i + 1;

    const type = asOptionalString(getCell(row, headerIndex, "type"));
    const entityId = asOptionalString(getCell(row, headerIndex, "entityid"));
    const entityName = asOptionalString(getCell(row, headerIndex, "entity"));
    const amount = parseMoneyToCents(getCell(row, headerIndex, "amount"));
    const transactionType =
      asOptionalString(getCell(row, headerIndex, "transactiontype")) ?? "payment";
    const paymentMethod =
      asOptionalString(getCell(row, headerIndex, "paymentmethod")) ?? "cash";
    const date = asOptionalString(getCell(row, headerIndex, "date"));
    const reference = asOptionalString(getCell(row, headerIndex, "reference"));
    const notes = asOptionalString(getCell(row, headerIndex, "notes"));

    if (!type || (type !== "customer" && type !== "supplier")) {
      errors.push({ row: rowNumber, message: "Type must be 'customer' or 'supplier'" });
      continue;
    }
    if (!entityId && !entityName) {
      errors.push({ row: rowNumber, message: "Entity or EntityId is required" });
      continue;
    }
    if (amount === undefined) {
      errors.push({ row: rowNumber, message: "Amount is required" });
      continue;
    }

    const payload: Partial<InsertPayment> = {
      type,
      entityId: entityId || String(entityName),
      amount,
      transactionType: transactionType as any,
      paymentMethod: paymentMethod as any,
      reference,
      notes,
      cashRegisterSessionId: null,
      createdBy: null,
      archived: false,
    };

    if (date) payload.date = new Date(date);

    const parsed = insertPaymentSchema.safeParse(payload);
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

export function parsePurchaseInvoicesImport(buffer: Buffer, filename: string): {
  invoices: PurchaseImportInvoice[];
  result: ImportResult;
} {
  const { rows } = readRowsFromFile(buffer, filename);
  const headerRow = rows[0] ?? [];
  const headerIndex = buildHeaderIndex(headerRow);

  const errors: ImportError[] = [];
  const invoicesByNumber = new Map<string, PurchaseImportInvoice>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rowNumber = i + 1;

    const invoiceNumber = asRequiredString(getCell(row, headerIndex, "invoicenumber"));
    const supplier = asRequiredString(getCell(row, headerIndex, "supplier"));
    const product = asRequiredString(getCell(row, headerIndex, "product"));
    const imei = asRequiredString(getCell(row, headerIndex, "imei"));
    const unitPrice = parseMoneyToCents(getCell(row, headerIndex, "unitprice"));

    if (!invoiceNumber) {
      errors.push({ row: rowNumber, message: "InvoiceNumber is required" });
      continue;
    }
    if (!supplier) {
      errors.push({ row: rowNumber, message: "Supplier is required" });
      continue;
    }
    if (!product) {
      errors.push({ row: rowNumber, message: "Product is required" });
      continue;
    }
    if (!imei) {
      errors.push({ row: rowNumber, message: "IMEI is required" });
      continue;
    }
    if (unitPrice === undefined) {
      errors.push({ row: rowNumber, message: "UnitPrice is required" });
      continue;
    }

    const date = asOptionalString(getCell(row, headerIndex, "date"));
    const discountAmount = parseMoneyToCents(getCell(row, headerIndex, "discountamount"));
    const paidAmount = parseMoneyToCents(getCell(row, headerIndex, "paidamount"));
    const notes = asOptionalString(getCell(row, headerIndex, "notes"));

    const rowData: PurchaseImportRow = {
      invoiceNumber,
      supplier,
      date,
      discountAmount,
      paidAmount,
      notes,
      product,
      imei,
      unitPrice,
    };

    const existing = invoicesByNumber.get(invoiceNumber);
    if (!existing) {
      invoicesByNumber.set(invoiceNumber, {
        invoiceNumber,
        supplier,
        date: rowData.date,
        discountAmount: rowData.discountAmount,
        paidAmount: rowData.paidAmount,
        notes: rowData.notes,
        items: [{ product, imei, unitPrice }],
      });
    } else {
      existing.items.push({ product, imei, unitPrice });
      existing.date = existing.date ?? rowData.date;
      existing.discountAmount = existing.discountAmount ?? rowData.discountAmount;
      existing.paidAmount = existing.paidAmount ?? rowData.paidAmount;
      existing.notes = existing.notes ?? rowData.notes;
    }
  }

  return {
    invoices: Array.from(invoicesByNumber.values()),
    result: {
      totalRows: Math.max(0, rows.length - 1),
      imported: invoicesByNumber.size,
      errors,
    },
  };
}

export function parseSalesImport(buffer: Buffer, filename: string): {
  sales: SaleImportSale[];
  result: ImportResult;
} {
  const { rows } = readRowsFromFile(buffer, filename);
  const headerRow = rows[0] ?? [];
  const headerIndex = buildHeaderIndex(headerRow);

  const errors: ImportError[] = [];
  const salesByNumber = new Map<string, SaleImportSale>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rowNumber = i + 1;

    const saleNumber = asRequiredString(getCell(row, headerIndex, "salenumber"));
    const imei = asRequiredString(getCell(row, headerIndex, "imei"));
    const unitPrice = parseMoneyToCents(getCell(row, headerIndex, "unitprice"));

    if (!saleNumber) {
      errors.push({ row: rowNumber, message: "SaleNumber is required" });
      continue;
    }
    if (!imei) {
      errors.push({ row: rowNumber, message: "IMEI is required" });
      continue;
    }
    if (unitPrice === undefined) {
      errors.push({ row: rowNumber, message: "UnitPrice is required" });
      continue;
    }

    const customer = asOptionalString(getCell(row, headerIndex, "customer"));
    const date = asOptionalString(getCell(row, headerIndex, "date"));
    const discountAmount = parseMoneyToCents(getCell(row, headerIndex, "discountamount"));
    const paidAmount = parseMoneyToCents(getCell(row, headerIndex, "paidamount"));
    const paymentMethod = asOptionalString(getCell(row, headerIndex, "paymentmethod"));
    const notes = asOptionalString(getCell(row, headerIndex, "notes"));

    const rowData: SaleImportRow = {
      saleNumber,
      customer,
      date,
      discountAmount,
      paidAmount,
      paymentMethod,
      notes,
      imei,
      unitPrice,
    };

    const existing = salesByNumber.get(saleNumber);
    if (!existing) {
      salesByNumber.set(saleNumber, {
        saleNumber,
        customer: rowData.customer,
        date: rowData.date,
        discountAmount: rowData.discountAmount,
        paidAmount: rowData.paidAmount,
        paymentMethod: rowData.paymentMethod,
        notes: rowData.notes,
        items: [{ imei, unitPrice }],
      });
    } else {
      existing.items.push({ imei, unitPrice });
      existing.customer = existing.customer ?? rowData.customer;
      existing.date = existing.date ?? rowData.date;
      existing.discountAmount = existing.discountAmount ?? rowData.discountAmount;
      existing.paidAmount = existing.paidAmount ?? rowData.paidAmount;
      existing.paymentMethod = existing.paymentMethod ?? rowData.paymentMethod;
      existing.notes = existing.notes ?? rowData.notes;
    }
  }

  return {
    sales: Array.from(salesByNumber.values()),
    result: {
      totalRows: Math.max(0, rows.length - 1),
      imported: salesByNumber.size,
      errors,
    },
  };
}

export function parseProductsImport(buffer: Buffer, filename: string): {
  records: InsertProduct[];
  result: ImportResult;
} {
  const { rows } = readRowsFromFile(buffer, filename);
  const headerRow = rows[0] ?? [];
  const headerIndex = buildHeaderIndex(headerRow);

  const errors: ImportError[] = [];
  const records: InsertProduct[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rowNumber = i + 1;

    const name = asOptionalString(getCell(row, headerIndex, "name"));
    if (!name) {
      continue;
    }

    const brand = asOptionalString(getCell(row, headerIndex, "brand"));
    const category = asOptionalString(getCell(row, headerIndex, "category"));
    const supplier = asOptionalString(getCell(row, headerIndex, "supplier"));
    const storage = asOptionalString(getCell(row, headerIndex, "storage"));
    const ram = asOptionalString(getCell(row, headerIndex, "ram"));
    const condition = asOptionalString(getCell(row, headerIndex, "condition"));

    const specifications = parseSpecificationsObject({
      supplier,
      storage,
      ram,
      condition,
    });

    const payload: Partial<InsertProduct> = {
      name,
      brand,
      category,
      specifications,
      archived: false,
    };

    const parsed = insertProductSchema.safeParse(payload);
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
