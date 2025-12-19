import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Auth sessions (connect-pg-simple uses this tableName by default in `server/auth.ts`).
export const authSessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Users with roles
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("cashier"), // admin, manager, cashier, viewer
  permissions: text("permissions").array().default(sql`'{}'::text[]`),
  archived: boolean("archived").default(false),
});

// Products (catalog items)
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  brand: text("brand"),
  category: text("category"),
  specifications: jsonb("specifications").default({}),
  archived: boolean("archived").default(false),
});

// Items (IMEI-level inventory)
export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  imei: text("imei").notNull().unique(),
  status: text("status").notNull().default("available"), // available, sold, archived
  
  // Purchase info
  purchasePrice: integer("purchase_price").notNull(), // In cents
  purchaseInvoiceId: varchar("purchase_invoice_id"),
  supplierId: varchar("supplier_id"),
  purchasedAt: timestamp("purchased_at"),
  
  // Sale info
  salePrice: integer("sale_price"),
  saleId: varchar("sale_id"),
  customerId: varchar("customer_id"),
  soldAt: timestamp("sold_at"),
  
  archived: boolean("archived").default(false),
});

// Customers
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  balance: integer("balance").default(0), // In cents (positive = they owe us)
  notes: text("notes"),
  archived: boolean("archived").default(false),
});

// Suppliers
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  balance: integer("balance").default(0), // In cents (positive = we owe them)
  notes: text("notes"),
  archived: boolean("archived").default(false),
});

// Purchase Invoices
export const purchaseInvoices = pgTable("purchase_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(),
  supplierId: varchar("supplier_id").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  cashRegisterSessionId: varchar("cash_register_session_id"),
  
  subtotal: integer("subtotal").notNull(), // In cents
  discountAmount: integer("discount_amount").default(0),
  totalAmount: integer("total_amount").notNull(),
  paidAmount: integer("paid_amount").default(0),
  balanceImpact: integer("balance_impact").notNull(), // total - paid
  
  paymentType: text("payment_type").notNull(), // full, partial, credit
  notes: text("notes"),
  createdBy: varchar("created_by"),
  archived: boolean("archived").default(false),
});

// Purchase Invoice Items
export const purchaseInvoiceItems = pgTable("purchase_invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  productId: varchar("product_id").notNull(),
  itemId: varchar("item_id").notNull(),
  imei: text("imei").notNull(),
  quantity: integer("quantity").default(1),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
});

// Sales
export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleNumber: text("sale_number").notNull().unique(),
  customerId: varchar("customer_id"), // NULL for walk-in
  date: timestamp("date").notNull().defaultNow(),
  
  subtotal: integer("subtotal").notNull(),
  discountAmount: integer("discount_amount").default(0),
  totalAmount: integer("total_amount").notNull(),
  paidAmount: integer("paid_amount").default(0),
  balanceImpact: integer("balance_impact").notNull(),
  profit: integer("profit").notNull(),
  
  paymentType: text("payment_type").notNull(), // full, partial, credit
  paymentMethod: text("payment_method").notNull(), // cash, card, transfer
  cashRegisterSessionId: varchar("cash_register_session_id"),
  notes: text("notes"),
  createdBy: varchar("created_by"),
  archived: boolean("archived").default(false),
});

// Sale Items
export const saleItems = pgTable("sale_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleId: varchar("sale_id").notNull(),
  productId: varchar("product_id").notNull(),
  itemId: varchar("item_id").notNull(),
  imei: text("imei").notNull(),
  quantity: integer("quantity").default(1),
  purchasePrice: integer("purchase_price").notNull(),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
  profit: integer("profit").notNull(),
});

// Payments (standalone)
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // customer, supplier
  entityId: varchar("entity_id").notNull(), // customer_id or supplier_id
  amount: integer("amount").notNull(),
  transactionType: text("transaction_type").notNull().default("payment"), // payment, refund
  date: timestamp("date").notNull().defaultNow(),
  paymentMethod: text("payment_method").notNull(), // cash, card, transfer, check
  reference: text("reference"),
  notes: text("notes"),
  cashRegisterSessionId: varchar("cash_register_session_id"),
  createdBy: varchar("created_by"),
  archived: boolean("archived").default(false),
});

// Cash Register Sessions
export const cashRegisterSessions = pgTable("cash_register_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionNumber: text("session_number").notNull().unique(),
  openedAt: timestamp("opened_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
  openedBy: varchar("opened_by").notNull(),
  closedBy: varchar("closed_by"),
  
  openingBalance: integer("opening_balance").notNull(),
  closingBalance: integer("closing_balance"),
  expectedBalance: integer("expected_balance"),
  actualBalance: integer("actual_balance"),
  difference: integer("difference"),
  
  status: text("status").notNull().default("open"), // open, closed
  notes: text("notes"),
});

// Expenses
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: text("description").notNull(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  paymentMethod: text("payment_method").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  cashRegisterSessionId: varchar("cash_register_session_id"),
  createdBy: varchar("created_by"),
  archived: boolean("archived").default(false),
});

// Currencies for multi-currency support
export const currencies = pgTable("currencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // ISO 4217 code (USD, EUR, SAR, etc.)
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  exchangeRate: integer("exchange_rate").notNull().default(10000), // Rate in 4 decimal (10000 = 1.0000)
  isDefault: boolean("is_default").default(false),
  decimals: integer("decimals").default(2),
  archived: boolean("archived").default(false),
});

// System Settings
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertItemSchema = createInsertSchema(items).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export const insertPurchaseInvoiceSchema = createInsertSchema(purchaseInvoices).omit({ id: true });
export const insertPurchaseInvoiceItemSchema = createInsertSchema(purchaseInvoiceItems).omit({ id: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true });
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true });
export const insertCashRegisterSessionSchema = createInsertSchema(cashRegisterSessions).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true });
export const insertCurrencySchema = createInsertSchema(currencies).omit({ id: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export type InsertPurchaseInvoice = z.infer<typeof insertPurchaseInvoiceSchema>;
export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;

export type InsertPurchaseInvoiceItem = z.infer<typeof insertPurchaseInvoiceItemSchema>;
export type PurchaseInvoiceItem = typeof purchaseInvoiceItems.$inferSelect;

export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;

export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type SaleItem = typeof saleItems.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertCashRegisterSession = z.infer<typeof insertCashRegisterSessionSchema>;
export type CashRegisterSession = typeof cashRegisterSessions.$inferSelect;

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export type InsertCurrency = z.infer<typeof insertCurrencySchema>;
export type Currency = typeof currencies.$inferSelect;

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

// Update schemas for comprehensive editing
export const updateSaleFullSchema = z.object({
  customerId: z.string().nullable().optional(),
  date: z.string().optional(), // ISO date string for date editing
  discountAmount: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(z.object({
    itemId: z.string(),
    unitPrice: z.number().min(0),
  })).min(1, "Sale must have at least one item"),
});

export type UpdateSaleFull = z.infer<typeof updateSaleFullSchema>;

export const updatePurchaseInvoiceFullSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  date: z.string().optional(), // ISO date string for date editing
  discountAmount: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  notes: z.string().nullable().optional(),
  items: z.array(z.object({
    itemId: z.string().optional(), // existing item id (for updates)
    productId: z.string(),
    imei: z.string().min(1, "IMEI is required"),
    unitPrice: z.number().min(0),
  })).min(1, "Purchase must have at least one item"),
});

// Schema for updating payment (date editing and other fields)
export const updatePaymentSchema = z.object({
  date: z.string().optional(), // ISO date string for date editing
  amount: z.number().min(1).optional(),
  paymentMethod: z.enum(["cash", "card", "transfer", "check"]).optional(),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type UpdatePayment = z.infer<typeof updatePaymentSchema>;

// Schema for updating cash register session (open date editing)
export const updateCashRegisterSessionDateSchema = z.object({
  openedAt: z.string(), // ISO date string for open date editing
});

export type UpdateCashRegisterSessionDate = z.infer<typeof updateCashRegisterSessionDateSchema>;

export type UpdatePurchaseInvoiceFull = z.infer<typeof updatePurchaseInvoiceFullSchema>;

// Extended types for frontend
export type ItemWithProduct = Item & { product: Product };
export type SaleWithCustomer = Sale & { customer?: Customer; items: (SaleItem & { product: Product })[] };
export type PurchaseInvoiceWithSupplier = PurchaseInvoice & { supplier: Supplier; items: (PurchaseInvoiceItem & { product: Product })[] };
export type PaymentWithEntity = Payment & { entity: Customer | Supplier };
