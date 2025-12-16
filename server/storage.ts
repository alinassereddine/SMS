import {
  type User, type InsertUser,
  type Product, type InsertProduct,
  type Item, type InsertItem,
  type Customer, type InsertCustomer,
  type Supplier, type InsertSupplier,
  type PurchaseInvoice, type InsertPurchaseInvoice,
  type PurchaseInvoiceItem, type InsertPurchaseInvoiceItem,
  type Sale, type InsertSale,
  type SaleItem, type InsertSaleItem,
  type Payment, type InsertPayment,
  type CashRegisterSession, type InsertCashRegisterSession,
  type Expense, type InsertExpense,
  type Currency, type InsertCurrency,
  type Setting,
  users, products, items, customers, suppliers,
  purchaseInvoices, purchaseInvoiceItems, sales, saleItems,
  payments, cashRegisterSessions, expenses, currencies, settings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  getItems(): Promise<Item[]>;
  getItem(id: string): Promise<Item | undefined>;
  getItemByImei(imei: string): Promise<Item | undefined>;
  getItemsByProductId(productId: string): Promise<Item[]>;
  getAvailableItems(): Promise<Item[]>;
  createItem(data: InsertItem): Promise<Item>;
  updateItem(id: string, data: Partial<InsertItem>): Promise<Item>;
  deleteItem(id: string): Promise<void>;

  getCustomers(): Promise<Customer[]>;
  getArchivedCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(data: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
  archiveCustomer(id: string): Promise<void>;
  restoreCustomer(id: string): Promise<void>;
  hardDeleteCustomer(id: string): Promise<void>;

  getSuppliers(): Promise<Supplier[]>;
  getArchivedSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(data: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, data: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;
  archiveSupplier(id: string): Promise<void>;
  restoreSupplier(id: string): Promise<void>;
  hardDeleteSupplier(id: string): Promise<void>;

  getPurchaseInvoices(): Promise<PurchaseInvoice[]>;
  getArchivedPurchaseInvoices(): Promise<PurchaseInvoice[]>;
  getPurchaseInvoice(id: string): Promise<PurchaseInvoice | undefined>;
  createPurchaseInvoice(data: InsertPurchaseInvoice): Promise<PurchaseInvoice>;
  updatePurchaseInvoice(id: string, data: Partial<InsertPurchaseInvoice>): Promise<PurchaseInvoice>;
  deletePurchaseInvoice(id: string): Promise<void>;
  archivePurchaseInvoice(id: string): Promise<void>;
  restorePurchaseInvoice(id: string): Promise<void>;
  hardDeletePurchaseInvoice(id: string): Promise<void>;

  getPurchaseInvoiceItems(invoiceId: string): Promise<PurchaseInvoiceItem[]>;
  createPurchaseInvoiceItem(data: InsertPurchaseInvoiceItem): Promise<PurchaseInvoiceItem>;
  deletePurchaseInvoiceItems(invoiceId: string): Promise<void>;

  getSales(): Promise<Sale[]>;
  getArchivedSales(): Promise<Sale[]>;
  getSale(id: string): Promise<Sale | undefined>;
  createSale(data: InsertSale): Promise<Sale>;
  updateSale(id: string, data: Partial<InsertSale>): Promise<Sale>;
  deleteSale(id: string): Promise<void>;
  archiveSale(id: string): Promise<void>;
  restoreSale(id: string): Promise<void>;
  hardDeleteSale(id: string): Promise<void>;

  getSaleItems(saleId: string): Promise<SaleItem[]>;
  createSaleItem(data: InsertSaleItem): Promise<SaleItem>;
  deleteSaleItems(saleId: string): Promise<void>;

  getPayments(): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByEntity(type: string, entityId: string): Promise<Payment[]>;
  createPayment(data: InsertPayment): Promise<Payment>;

  getCashRegisterSessions(): Promise<CashRegisterSession[]>;
  getCashRegisterSession(id: string): Promise<CashRegisterSession | undefined>;
  getActiveCashRegisterSession(): Promise<CashRegisterSession | undefined>;
  createCashRegisterSession(data: InsertCashRegisterSession): Promise<CashRegisterSession>;
  updateCashRegisterSession(id: string, data: Partial<InsertCashRegisterSession>): Promise<CashRegisterSession>;

  getExpenses(): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(data: InsertExpense): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;

  getCurrencies(): Promise<Currency[]>;
  getCurrency(id: string): Promise<Currency | undefined>;
  getDefaultCurrency(): Promise<Currency | undefined>;
  createCurrency(data: InsertCurrency): Promise<Currency>;
  updateCurrency(id: string, data: Partial<InsertCurrency>): Promise<Currency>;
  setDefaultCurrency(id: string): Promise<Currency>;
  deleteCurrency(id: string): Promise<void>;

  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.archived, false));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(data).returning();
    return product;
  }

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.update(products).set({ archived: true }).where(eq(products.id, id));
  }

  async getItems(): Promise<Item[]> {
    return await db.select().from(items).where(eq(items.archived, false));
  }

  async getItem(id: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item || undefined;
  }

  async getItemByImei(imei: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.imei, imei));
    return item || undefined;
  }

  async getItemsByProductId(productId: string): Promise<Item[]> {
    return await db.select().from(items).where(and(eq(items.productId, productId), eq(items.archived, false)));
  }

  async getAvailableItems(): Promise<Item[]> {
    return await db.select().from(items).where(and(eq(items.status, "available"), eq(items.archived, false)));
  }

  async createItem(data: InsertItem): Promise<Item> {
    const [item] = await db.insert(items).values(data).returning();
    return item;
  }

  async updateItem(id: string, data: Partial<InsertItem>): Promise<Item> {
    const [item] = await db.update(items).set(data).where(eq(items.id, id)).returning();
    return item;
  }

  async deleteItem(id: string): Promise<void> {
    await db.update(items).set({ archived: true }).where(eq(items.id, id));
  }

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.archived, false));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(data).returning();
    return customer;
  }

  async updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer> {
    const [customer] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
    return customer;
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.update(customers).set({ archived: true }).where(eq(customers.id, id));
  }

  async getArchivedCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.archived, true));
  }

  async archiveCustomer(id: string): Promise<void> {
    await db.update(customers).set({ archived: true }).where(eq(customers.id, id));
  }

  async restoreCustomer(id: string): Promise<void> {
    await db.update(customers).set({ archived: false }).where(eq(customers.id, id));
  }

  async hardDeleteCustomer(id: string): Promise<void> {
    // Delete all related payments
    await db.delete(payments).where(and(eq(payments.type, "customer"), eq(payments.entityId, id)));
    // Update items to remove customer reference
    await db.update(items).set({ customerId: null }).where(eq(items.customerId, id));
    // Update sales to remove customer reference
    await db.update(sales).set({ customerId: null }).where(eq(sales.customerId, id));
    // Delete the customer
    await db.delete(customers).where(eq(customers.id, id));
  }

  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).where(eq(suppliers.archived, false));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async createSupplier(data: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(data).returning();
    return supplier;
  }

  async updateSupplier(id: string, data: Partial<InsertSupplier>): Promise<Supplier> {
    const [supplier] = await db.update(suppliers).set(data).where(eq(suppliers.id, id)).returning();
    return supplier;
  }

  async deleteSupplier(id: string): Promise<void> {
    await db.update(suppliers).set({ archived: true }).where(eq(suppliers.id, id));
  }

  async getArchivedSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).where(eq(suppliers.archived, true));
  }

  async archiveSupplier(id: string): Promise<void> {
    await db.update(suppliers).set({ archived: true }).where(eq(suppliers.id, id));
  }

  async restoreSupplier(id: string): Promise<void> {
    await db.update(suppliers).set({ archived: false }).where(eq(suppliers.id, id));
  }

  async hardDeleteSupplier(id: string): Promise<void> {
    // Delete all related payments
    await db.delete(payments).where(and(eq(payments.type, "supplier"), eq(payments.entityId, id)));
    // Update items to remove supplier reference
    await db.update(items).set({ supplierId: null }).where(eq(items.supplierId, id));
    // Update purchase invoices to remove supplier reference (but keep invoice)
    await db.update(purchaseInvoices).set({ supplierId: "" }).where(eq(purchaseInvoices.supplierId, id));
    // Delete the supplier
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }

  async getPurchaseInvoices(): Promise<PurchaseInvoice[]> {
    return await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.archived, false)).orderBy(desc(purchaseInvoices.date));
  }

  async getPurchaseInvoice(id: string): Promise<PurchaseInvoice | undefined> {
    const [invoice] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id));
    return invoice || undefined;
  }

  async createPurchaseInvoice(data: InsertPurchaseInvoice): Promise<PurchaseInvoice> {
    const [invoice] = await db.insert(purchaseInvoices).values(data).returning();
    return invoice;
  }

  async updatePurchaseInvoice(id: string, data: Partial<InsertPurchaseInvoice>): Promise<PurchaseInvoice> {
    const [invoice] = await db.update(purchaseInvoices).set(data).where(eq(purchaseInvoices.id, id)).returning();
    return invoice;
  }

  async deletePurchaseInvoice(id: string): Promise<void> {
    await db.delete(purchaseInvoices).where(eq(purchaseInvoices.id, id));
  }

  async getArchivedPurchaseInvoices(): Promise<PurchaseInvoice[]> {
    return await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.archived, true)).orderBy(desc(purchaseInvoices.date));
  }

  async archivePurchaseInvoice(id: string): Promise<void> {
    await db.update(purchaseInvoices).set({ archived: true }).where(eq(purchaseInvoices.id, id));
  }

  async restorePurchaseInvoice(id: string): Promise<void> {
    await db.update(purchaseInvoices).set({ archived: false }).where(eq(purchaseInvoices.id, id));
  }

  async hardDeletePurchaseInvoice(id: string): Promise<void> {
    // Delete purchase invoice items
    await db.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));
    // Archive related items (don't delete as they may have sales history)
    await db.update(items).set({ archived: true, purchaseInvoiceId: null }).where(eq(items.purchaseInvoiceId, id));
    // Delete the invoice
    await db.delete(purchaseInvoices).where(eq(purchaseInvoices.id, id));
  }

  async getPurchaseInvoiceItems(invoiceId: string): Promise<PurchaseInvoiceItem[]> {
    return await db.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, invoiceId));
  }

  async createPurchaseInvoiceItem(data: InsertPurchaseInvoiceItem): Promise<PurchaseInvoiceItem> {
    const [item] = await db.insert(purchaseInvoiceItems).values(data).returning();
    return item;
  }

  async deletePurchaseInvoiceItems(invoiceId: string): Promise<void> {
    await db.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, invoiceId));
  }

  async getSales(): Promise<Sale[]> {
    return await db.select().from(sales).where(eq(sales.archived, false)).orderBy(desc(sales.date));
  }

  async getSale(id: string): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale || undefined;
  }

  async createSale(data: InsertSale): Promise<Sale> {
    const [sale] = await db.insert(sales).values(data).returning();
    return sale;
  }

  async updateSale(id: string, data: Partial<InsertSale>): Promise<Sale> {
    const [sale] = await db.update(sales).set(data).where(eq(sales.id, id)).returning();
    return sale;
  }

  async deleteSale(id: string): Promise<void> {
    await db.delete(sales).where(eq(sales.id, id));
  }

  async getArchivedSales(): Promise<Sale[]> {
    return await db.select().from(sales).where(eq(sales.archived, true)).orderBy(desc(sales.date));
  }

  async archiveSale(id: string): Promise<void> {
    await db.update(sales).set({ archived: true }).where(eq(sales.id, id));
  }

  async restoreSale(id: string): Promise<void> {
    await db.update(sales).set({ archived: false }).where(eq(sales.id, id));
  }

  async hardDeleteSale(id: string): Promise<void> {
    // Delete sale items
    await db.delete(saleItems).where(eq(saleItems.saleId, id));
    // Update items to make them available again
    await db.update(items).set({ status: "available", saleId: null, soldAt: null }).where(eq(items.saleId, id));
    // Delete the sale
    await db.delete(sales).where(eq(sales.id, id));
  }

  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    return await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
  }

  async createSaleItem(data: InsertSaleItem): Promise<SaleItem> {
    const [item] = await db.insert(saleItems).values(data).returning();
    return item;
  }

  async deleteSaleItems(saleId: string): Promise<void> {
    await db.delete(saleItems).where(eq(saleItems.saleId, saleId));
  }

  async getPayments(): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.archived, false)).orderBy(desc(payments.date));
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentsByEntity(type: string, entityId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(and(eq(payments.type, type), eq(payments.entityId, entityId), eq(payments.archived, false)));
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(data).returning();
    return payment;
  }

  async getCashRegisterSessions(): Promise<CashRegisterSession[]> {
    return await db.select().from(cashRegisterSessions).orderBy(desc(cashRegisterSessions.openedAt));
  }

  async getCashRegisterSession(id: string): Promise<CashRegisterSession | undefined> {
    const [session] = await db.select().from(cashRegisterSessions).where(eq(cashRegisterSessions.id, id));
    return session || undefined;
  }

  async getActiveCashRegisterSession(): Promise<CashRegisterSession | undefined> {
    const [session] = await db.select().from(cashRegisterSessions).where(eq(cashRegisterSessions.status, "open"));
    return session || undefined;
  }

  async createCashRegisterSession(data: InsertCashRegisterSession): Promise<CashRegisterSession> {
    const [session] = await db.insert(cashRegisterSessions).values(data).returning();
    return session;
  }

  async updateCashRegisterSession(id: string, data: Partial<InsertCashRegisterSession>): Promise<CashRegisterSession> {
    const [session] = await db.update(cashRegisterSessions).set(data).where(eq(cashRegisterSessions.id, id)).returning();
    return session;
  }

  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.archived, false)).orderBy(desc(expenses.date));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(data: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(data).returning();
    return expense;
  }

  async deleteExpense(id: string): Promise<void> {
    await db.update(expenses).set({ archived: true }).where(eq(expenses.id, id));
  }

  async getCurrencies(): Promise<Currency[]> {
    return await db.select().from(currencies).where(eq(currencies.archived, false));
  }

  async getCurrency(id: string): Promise<Currency | undefined> {
    const [currency] = await db.select().from(currencies).where(eq(currencies.id, id));
    return currency || undefined;
  }

  async getDefaultCurrency(): Promise<Currency | undefined> {
    const [currency] = await db.select().from(currencies).where(
      and(eq(currencies.isDefault, true), eq(currencies.archived, false))
    );
    return currency || undefined;
  }

  async createCurrency(data: InsertCurrency): Promise<Currency> {
    const [currency] = await db.insert(currencies).values(data).returning();
    return currency;
  }

  async updateCurrency(id: string, data: Partial<InsertCurrency>): Promise<Currency> {
    const [currency] = await db.update(currencies).set(data).where(eq(currencies.id, id)).returning();
    return currency;
  }

  async setDefaultCurrency(id: string): Promise<Currency> {
    await db.update(currencies).set({ isDefault: false }).where(eq(currencies.isDefault, true));
    const [currency] = await db.update(currencies).set({ isDefault: true }).where(eq(currencies.id, id)).returning();
    return currency;
  }

  async deleteCurrency(id: string): Promise<void> {
    await db.update(currencies).set({ archived: true }).where(eq(currencies.id, id));
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [setting] = await db.update(settings).set({ value }).where(eq(settings.key, key)).returning();
      return setting;
    } else {
      const [setting] = await db.insert(settings).values({ key, value }).returning();
      return setting;
    }
  }
}

export const storage = new DatabaseStorage();
