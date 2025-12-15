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
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Items
  getItems(): Promise<Item[]>;
  getItem(id: string): Promise<Item | undefined>;
  getItemByImei(imei: string): Promise<Item | undefined>;
  getItemsByProductId(productId: string): Promise<Item[]>;
  getAvailableItems(): Promise<Item[]>;
  createItem(data: InsertItem): Promise<Item>;
  updateItem(id: string, data: Partial<InsertItem>): Promise<Item>;
  deleteItem(id: string): Promise<void>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(data: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(data: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, data: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;

  // Purchase Invoices
  getPurchaseInvoices(): Promise<PurchaseInvoice[]>;
  getPurchaseInvoice(id: string): Promise<PurchaseInvoice | undefined>;
  createPurchaseInvoice(data: InsertPurchaseInvoice): Promise<PurchaseInvoice>;
  updatePurchaseInvoice(id: string, data: Partial<InsertPurchaseInvoice>): Promise<PurchaseInvoice>;

  // Purchase Invoice Items
  getPurchaseInvoiceItems(invoiceId: string): Promise<PurchaseInvoiceItem[]>;
  createPurchaseInvoiceItem(data: InsertPurchaseInvoiceItem): Promise<PurchaseInvoiceItem>;

  // Sales
  getSales(): Promise<Sale[]>;
  getSale(id: string): Promise<Sale | undefined>;
  createSale(data: InsertSale): Promise<Sale>;
  updateSale(id: string, data: Partial<InsertSale>): Promise<Sale>;

  // Sale Items
  getSaleItems(saleId: string): Promise<SaleItem[]>;
  createSaleItem(data: InsertSaleItem): Promise<SaleItem>;

  // Payments
  getPayments(): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByEntity(type: string, entityId: string): Promise<Payment[]>;
  createPayment(data: InsertPayment): Promise<Payment>;

  // Cash Register Sessions
  getCashRegisterSessions(): Promise<CashRegisterSession[]>;
  getCashRegisterSession(id: string): Promise<CashRegisterSession | undefined>;
  getActiveCashRegisterSession(): Promise<CashRegisterSession | undefined>;
  createCashRegisterSession(data: InsertCashRegisterSession): Promise<CashRegisterSession>;
  updateCashRegisterSession(id: string, data: Partial<InsertCashRegisterSession>): Promise<CashRegisterSession>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(data: InsertExpense): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private products: Map<string, Product>;
  private items: Map<string, Item>;
  private customers: Map<string, Customer>;
  private suppliers: Map<string, Supplier>;
  private purchaseInvoices: Map<string, PurchaseInvoice>;
  private purchaseInvoiceItems: Map<string, PurchaseInvoiceItem>;
  private sales: Map<string, Sale>;
  private saleItems: Map<string, SaleItem>;
  private payments: Map<string, Payment>;
  private cashRegisterSessions: Map<string, CashRegisterSession>;
  private expenses: Map<string, Expense>;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.items = new Map();
    this.customers = new Map();
    this.suppliers = new Map();
    this.purchaseInvoices = new Map();
    this.purchaseInvoiceItems = new Map();
    this.sales = new Map();
    this.saleItems = new Map();
    this.payments = new Map();
    this.cashRegisterSessions = new Map();
    this.expenses = new Map();

    this.seedData();
  }

  private seedData() {
    // Seed some products
    const products = [
      { name: "iPhone 15 Pro Max", brand: "Apple", category: "Smartphones" },
      { name: "Galaxy S24 Ultra", brand: "Samsung", category: "Smartphones" },
      { name: "Pixel 8 Pro", brand: "Google", category: "Smartphones" },
      { name: "MacBook Pro 14\"", brand: "Apple", category: "Laptops" },
      { name: "iPad Pro 12.9\"", brand: "Apple", category: "Tablets" },
    ];

    products.forEach(p => {
      const id = randomUUID();
      this.products.set(id, { id, ...p, specifications: {}, archived: false });
    });

    // Seed customers
    const customers = [
      { name: "Ahmed Mohammed", phone: "+966501234567", balance: 0 },
      { name: "Fatima Ali", phone: "+966509876543", balance: 50000 },
      { name: "Omar Hassan", phone: "+966551112222", balance: -25000 },
    ];

    customers.forEach(c => {
      const id = randomUUID();
      this.customers.set(id, { id, ...c, email: null, address: null, notes: null, archived: false });
    });

    // Seed suppliers
    const suppliers = [
      { name: "Tech Distributors", phone: "+966111222333", balance: 100000 },
      { name: "Mobile World", phone: "+966222333444", balance: 0 },
      { name: "Electronics Hub", phone: "+966333444555", balance: -50000 },
    ];

    suppliers.forEach(s => {
      const id = randomUUID();
      this.suppliers.set(id, { id, ...s, email: null, address: null, notes: null, archived: false });
    });

    // Seed some items
    const productIds = Array.from(this.products.keys());
    const supplierIds = Array.from(this.suppliers.keys());
    
    for (let i = 0; i < 10; i++) {
      const id = randomUUID();
      const productId = productIds[i % productIds.length];
      const supplierId = supplierIds[i % supplierIds.length];
      const imei = `35${String(Math.floor(Math.random() * 10000000000000)).padStart(13, "0")}`;
      
      this.items.set(id, {
        id,
        productId,
        imei,
        status: "available",
        purchasePrice: 300000 + Math.floor(Math.random() * 200000),
        purchaseInvoiceId: null,
        supplierId,
        purchasedAt: new Date(),
        salePrice: null,
        saleId: null,
        customerId: null,
        soldAt: null,
        archived: false,
      });
    }

    // Seed a default admin user
    const adminId = randomUUID();
    this.users.set(adminId, {
      id: adminId,
      username: "admin",
      password: "admin123",
      displayName: "Administrator",
      role: "admin",
      permissions: [],
      archived: false,
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(data: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { id, ...data, archived: data.archived ?? false, permissions: data.permissions ?? [], role: data.role ?? "cashier" };
    this.users.set(id, user);
    return user;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => !p.archived);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = { id, ...data, archived: data.archived ?? false, specifications: data.specifications ?? {} };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product> {
    const existing = this.products.get(id);
    if (!existing) throw new Error("Product not found");
    const updated = { ...existing, ...data };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    const existing = this.products.get(id);
    if (existing) {
      this.products.set(id, { ...existing, archived: true });
    }
  }

  // Items
  async getItems(): Promise<Item[]> {
    return Array.from(this.items.values()).filter(i => !i.archived);
  }

  async getItem(id: string): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async getItemByImei(imei: string): Promise<Item | undefined> {
    return Array.from(this.items.values()).find(i => i.imei === imei && !i.archived);
  }

  async getItemsByProductId(productId: string): Promise<Item[]> {
    return Array.from(this.items.values()).filter(i => i.productId === productId && !i.archived);
  }

  async getAvailableItems(): Promise<Item[]> {
    return Array.from(this.items.values()).filter(i => i.status === "available" && !i.archived);
  }

  async createItem(data: InsertItem): Promise<Item> {
    const id = randomUUID();
    const item: Item = {
      id,
      productId: data.productId,
      imei: data.imei,
      status: data.status ?? "available",
      purchasePrice: data.purchasePrice,
      purchaseInvoiceId: data.purchaseInvoiceId ?? null,
      supplierId: data.supplierId ?? null,
      purchasedAt: data.purchasedAt ?? null,
      salePrice: data.salePrice ?? null,
      saleId: data.saleId ?? null,
      customerId: data.customerId ?? null,
      soldAt: data.soldAt ?? null,
      archived: data.archived ?? false,
    };
    this.items.set(id, item);
    return item;
  }

  async updateItem(id: string, data: Partial<InsertItem>): Promise<Item> {
    const existing = this.items.get(id);
    if (!existing) throw new Error("Item not found");
    const updated = { ...existing, ...data };
    this.items.set(id, updated);
    return updated;
  }

  async deleteItem(id: string): Promise<void> {
    const existing = this.items.get(id);
    if (existing) {
      this.items.set(id, { ...existing, archived: true });
    }
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values()).filter(c => !c.archived);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = {
      id,
      name: data.name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      address: data.address ?? null,
      balance: data.balance ?? 0,
      notes: data.notes ?? null,
      archived: data.archived ?? false,
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer> {
    const existing = this.customers.get(id);
    if (!existing) throw new Error("Customer not found");
    const updated = { ...existing, ...data };
    this.customers.set(id, updated);
    return updated;
  }

  async deleteCustomer(id: string): Promise<void> {
    const existing = this.customers.get(id);
    if (existing) {
      this.customers.set(id, { ...existing, archived: true });
    }
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliers.values()).filter(s => !s.archived);
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }

  async createSupplier(data: InsertSupplier): Promise<Supplier> {
    const id = randomUUID();
    const supplier: Supplier = {
      id,
      name: data.name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      address: data.address ?? null,
      balance: data.balance ?? 0,
      notes: data.notes ?? null,
      archived: data.archived ?? false,
    };
    this.suppliers.set(id, supplier);
    return supplier;
  }

  async updateSupplier(id: string, data: Partial<InsertSupplier>): Promise<Supplier> {
    const existing = this.suppliers.get(id);
    if (!existing) throw new Error("Supplier not found");
    const updated = { ...existing, ...data };
    this.suppliers.set(id, updated);
    return updated;
  }

  async deleteSupplier(id: string): Promise<void> {
    const existing = this.suppliers.get(id);
    if (existing) {
      this.suppliers.set(id, { ...existing, archived: true });
    }
  }

  // Purchase Invoices
  async getPurchaseInvoices(): Promise<PurchaseInvoice[]> {
    return Array.from(this.purchaseInvoices.values()).filter(p => !p.archived);
  }

  async getPurchaseInvoice(id: string): Promise<PurchaseInvoice | undefined> {
    return this.purchaseInvoices.get(id);
  }

  async createPurchaseInvoice(data: InsertPurchaseInvoice): Promise<PurchaseInvoice> {
    const id = randomUUID();
    const invoice: PurchaseInvoice = {
      id,
      invoiceNumber: data.invoiceNumber,
      supplierId: data.supplierId,
      date: data.date ?? new Date(),
      subtotal: data.subtotal,
      discountAmount: data.discountAmount ?? 0,
      totalAmount: data.totalAmount,
      paidAmount: data.paidAmount ?? 0,
      balanceImpact: data.balanceImpact,
      paymentType: data.paymentType,
      notes: data.notes ?? null,
      createdBy: data.createdBy ?? null,
      archived: data.archived ?? false,
    };
    this.purchaseInvoices.set(id, invoice);
    return invoice;
  }

  async updatePurchaseInvoice(id: string, data: Partial<InsertPurchaseInvoice>): Promise<PurchaseInvoice> {
    const existing = this.purchaseInvoices.get(id);
    if (!existing) throw new Error("Purchase invoice not found");
    const updated = { ...existing, ...data };
    this.purchaseInvoices.set(id, updated);
    return updated;
  }

  // Purchase Invoice Items
  async getPurchaseInvoiceItems(invoiceId: string): Promise<PurchaseInvoiceItem[]> {
    return Array.from(this.purchaseInvoiceItems.values()).filter(i => i.invoiceId === invoiceId);
  }

  async createPurchaseInvoiceItem(data: InsertPurchaseInvoiceItem): Promise<PurchaseInvoiceItem> {
    const id = randomUUID();
    const item: PurchaseInvoiceItem = {
      id,
      invoiceId: data.invoiceId,
      productId: data.productId,
      itemId: data.itemId,
      imei: data.imei,
      quantity: data.quantity ?? 1,
      unitPrice: data.unitPrice,
      totalPrice: data.totalPrice,
    };
    this.purchaseInvoiceItems.set(id, item);
    return item;
  }

  // Sales
  async getSales(): Promise<Sale[]> {
    return Array.from(this.sales.values()).filter(s => !s.archived);
  }

  async getSale(id: string): Promise<Sale | undefined> {
    return this.sales.get(id);
  }

  async createSale(data: InsertSale): Promise<Sale> {
    const id = randomUUID();
    const sale: Sale = {
      id,
      saleNumber: data.saleNumber,
      customerId: data.customerId ?? null,
      date: data.date ?? new Date(),
      subtotal: data.subtotal,
      discountAmount: data.discountAmount ?? 0,
      totalAmount: data.totalAmount,
      paidAmount: data.paidAmount ?? 0,
      balanceImpact: data.balanceImpact,
      profit: data.profit,
      paymentType: data.paymentType,
      paymentMethod: data.paymentMethod,
      cashRegisterSessionId: data.cashRegisterSessionId ?? null,
      notes: data.notes ?? null,
      createdBy: data.createdBy ?? null,
      archived: data.archived ?? false,
    };
    this.sales.set(id, sale);
    return sale;
  }

  async updateSale(id: string, data: Partial<InsertSale>): Promise<Sale> {
    const existing = this.sales.get(id);
    if (!existing) throw new Error("Sale not found");
    const updated = { ...existing, ...data };
    this.sales.set(id, updated);
    return updated;
  }

  // Sale Items
  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    return Array.from(this.saleItems.values()).filter(i => i.saleId === saleId);
  }

  async createSaleItem(data: InsertSaleItem): Promise<SaleItem> {
    const id = randomUUID();
    const item: SaleItem = {
      id,
      saleId: data.saleId,
      productId: data.productId,
      itemId: data.itemId,
      imei: data.imei,
      quantity: data.quantity ?? 1,
      purchasePrice: data.purchasePrice,
      unitPrice: data.unitPrice,
      totalPrice: data.totalPrice,
      profit: data.profit,
    };
    this.saleItems.set(id, item);
    return item;
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(p => !p.archived);
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentsByEntity(type: string, entityId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(p => p.type === type && p.entityId === entityId && !p.archived);
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const payment: Payment = {
      id,
      type: data.type,
      entityId: data.entityId,
      amount: data.amount,
      date: data.date ?? new Date(),
      paymentMethod: data.paymentMethod,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
      cashRegisterSessionId: data.cashRegisterSessionId ?? null,
      createdBy: data.createdBy ?? null,
      archived: data.archived ?? false,
    };
    this.payments.set(id, payment);
    return payment;
  }

  // Cash Register Sessions
  async getCashRegisterSessions(): Promise<CashRegisterSession[]> {
    return Array.from(this.cashRegisterSessions.values());
  }

  async getCashRegisterSession(id: string): Promise<CashRegisterSession | undefined> {
    return this.cashRegisterSessions.get(id);
  }

  async getActiveCashRegisterSession(): Promise<CashRegisterSession | undefined> {
    return Array.from(this.cashRegisterSessions.values()).find(s => s.status === "open");
  }

  async createCashRegisterSession(data: InsertCashRegisterSession): Promise<CashRegisterSession> {
    const id = randomUUID();
    const session: CashRegisterSession = {
      id,
      sessionNumber: data.sessionNumber,
      openedAt: data.openedAt ?? new Date(),
      closedAt: data.closedAt ?? null,
      openedBy: data.openedBy,
      closedBy: data.closedBy ?? null,
      openingBalance: data.openingBalance,
      closingBalance: data.closingBalance ?? null,
      expectedBalance: data.expectedBalance ?? null,
      actualBalance: data.actualBalance ?? null,
      difference: data.difference ?? null,
      status: data.status ?? "open",
      notes: data.notes ?? null,
    };
    this.cashRegisterSessions.set(id, session);
    return session;
  }

  async updateCashRegisterSession(id: string, data: Partial<InsertCashRegisterSession>): Promise<CashRegisterSession> {
    const existing = this.cashRegisterSessions.get(id);
    if (!existing) throw new Error("Cash register session not found");
    const updated = { ...existing, ...data };
    this.cashRegisterSessions.set(id, updated);
    return updated;
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(e => !e.archived);
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(data: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const expense: Expense = {
      id,
      description: data.description,
      category: data.category,
      amount: data.amount,
      date: data.date ?? new Date(),
      paymentMethod: data.paymentMethod,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
      cashRegisterSessionId: data.cashRegisterSessionId ?? null,
      createdBy: data.createdBy ?? null,
      archived: data.archived ?? false,
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async deleteExpense(id: string): Promise<void> {
    const existing = this.expenses.get(id);
    if (existing) {
      this.expenses.set(id, { ...existing, archived: true });
    }
  }
}

export const storage = new MemStorage();
