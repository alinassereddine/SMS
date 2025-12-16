import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, requirePermission } from "./auth";
import {
  insertProductSchema,
  insertItemSchema,
  insertCustomerSchema,
  insertSupplierSchema,
  insertPurchaseInvoiceSchema,
  insertPurchaseInvoiceItemSchema,
  insertSaleSchema,
  insertSaleItemSchema,
  insertPaymentSchema,
  insertCashRegisterSessionSchema,
  insertExpenseSchema,
  insertCurrencySchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Apply authentication to all API routes except auth endpoints
  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth")) {
      return next();
    }
    return requireAuth(req, res, next);
  });

  // ============ PRODUCTS ============
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", requirePermission("products:write"), async (req, res) => {
    try {
      const data = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(data);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", requirePermission("products:write"), async (req, res) => {
    try {
      const data = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, data);
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", requirePermission("products:delete"), async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // ============ ITEMS ============
  app.get("/api/items", async (req, res) => {
    try {
      const { status, productId } = req.query;
      let items = await storage.getItems();
      
      if (status === "available") {
        items = items.filter(i => i.status === "available");
      } else if (status) {
        items = items.filter(i => i.status === status);
      }
      
      if (productId) {
        items = items.filter(i => i.productId === productId);
      }

      // Enrich with product data
      const products = await storage.getProducts();
      const productMap = new Map(products.map(p => [p.id, p]));
      
      const enrichedItems = items.map(item => ({
        ...item,
        product: productMap.get(item.productId),
      }));

      res.json(enrichedItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.get("/api/items/:id", async (req, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      if (!item) return res.status(404).json({ error: "Item not found" });
      
      const product = await storage.getProduct(item.productId);
      res.json({ ...item, product });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  app.get("/api/items/imei/:imei", async (req, res) => {
    try {
      const item = await storage.getItemByImei(req.params.imei);
      if (!item) return res.status(404).json({ error: "Item not found" });
      
      const product = await storage.getProduct(item.productId);
      res.json({ ...item, product });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  app.post("/api/items", requirePermission("inventory:write"), async (req, res) => {
    try {
      const data = insertItemSchema.parse(req.body);
      
      // Check for duplicate IMEI
      const existing = await storage.getItemByImei(data.imei);
      if (existing) {
        return res.status(400).json({ error: "IMEI already exists" });
      }
      
      const item = await storage.createItem(data);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create item" });
    }
  });

  app.patch("/api/items/:id", requirePermission("inventory:write"), async (req, res) => {
    try {
      const data = insertItemSchema.partial().parse(req.body);
      const item = await storage.updateItem(req.params.id, data);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", requirePermission("inventory:delete"), async (req, res) => {
    try {
      await storage.deleteItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // ============ CUSTOMERS ============
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", requirePermission("customers:write"), async (req, res) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(data);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", requirePermission("customers:write"), async (req, res) => {
    try {
      const data = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, data);
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", requirePermission("customers:delete"), async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // ============ SUPPLIERS ============
  app.get("/api/suppliers", async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.get("/api/suppliers/:id", async (req, res) => {
    try {
      const supplier = await storage.getSupplier(req.params.id);
      if (!supplier) return res.status(404).json({ error: "Supplier not found" });
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier" });
    }
  });

  app.post("/api/suppliers", requirePermission("suppliers:write"), async (req, res) => {
    try {
      const data = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(data);
      res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create supplier" });
    }
  });

  app.patch("/api/suppliers/:id", requirePermission("suppliers:write"), async (req, res) => {
    try {
      const data = insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(req.params.id, data);
      res.json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update supplier" });
    }
  });

  app.delete("/api/suppliers/:id", requirePermission("suppliers:delete"), async (req, res) => {
    try {
      await storage.deleteSupplier(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });

  // ============ SALES ============
  app.get("/api/sales", async (req, res) => {
    try {
      const sales = await storage.getSales();
      
      // Enrich with customer data
      const customers = await storage.getCustomers();
      const customerMap = new Map(customers.map(c => [c.id, c]));
      
      const enrichedSales = await Promise.all(sales.map(async sale => {
        const saleItems = await storage.getSaleItems(sale.id);
        const products = await storage.getProducts();
        const productMap = new Map(products.map(p => [p.id, p]));
        
        return {
          ...sale,
          customer: sale.customerId ? customerMap.get(sale.customerId) : null,
          items: saleItems.map(item => ({
            ...item,
            product: productMap.get(item.productId),
          })),
        };
      }));

      res.json(enrichedSales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  app.get("/api/sales/:id", async (req, res) => {
    try {
      const sale = await storage.getSale(req.params.id);
      if (!sale) return res.status(404).json({ error: "Sale not found" });
      
      const customer = sale.customerId ? await storage.getCustomer(sale.customerId) : null;
      const saleItems = await storage.getSaleItems(sale.id);
      const products = await storage.getProducts();
      const productMap = new Map(products.map(p => [p.id, p]));
      
      res.json({
        ...sale,
        customer,
        items: saleItems.map(item => ({
          ...item,
          product: productMap.get(item.productId),
        })),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sale" });
    }
  });

  // Create sale with items
  const createSaleSchema = z.object({
    customerId: z.string().nullable().optional(),
    subtotal: z.number(),
    discountAmount: z.number().optional(),
    totalAmount: z.number(),
    paidAmount: z.number().optional(),
    paymentType: z.string(),
    paymentMethod: z.string(),
    notes: z.string().optional(),
    items: z.array(z.object({
      itemId: z.string(),
      unitPrice: z.number(),
    })),
  });

  app.post("/api/sales", requirePermission("sales:write"), async (req, res) => {
    try {
      const data = createSaleSchema.parse(req.body);
      
      // Generate sale number
      const sales = await storage.getSales();
      const saleNumber = `S${String(sales.length + 1).padStart(6, "0")}`;
      
      // Calculate totals and profit
      let totalProfit = 0;
      const itemDetails = await Promise.all(data.items.map(async saleItem => {
        const item = await storage.getItem(saleItem.itemId);
        if (!item) throw new Error(`Item not found: ${saleItem.itemId}`);
        if (item.status !== "available") throw new Error(`Item not available: ${item.imei}`);
        
        const profit = saleItem.unitPrice - item.purchasePrice;
        totalProfit += profit;
        
        return {
          item,
          unitPrice: saleItem.unitPrice,
          profit,
        };
      }));

      const balanceImpact = data.totalAmount - (data.paidAmount || 0);

      // Get active cash register session
      const activeSession = await storage.getActiveCashRegisterSession();

      // Create the sale
      const sale = await storage.createSale({
        saleNumber,
        customerId: data.customerId || null,
        subtotal: data.subtotal,
        discountAmount: data.discountAmount || 0,
        totalAmount: data.totalAmount,
        paidAmount: data.paidAmount || 0,
        balanceImpact,
        profit: totalProfit,
        paymentType: data.paymentType,
        paymentMethod: data.paymentMethod,
        cashRegisterSessionId: activeSession?.id || null,
        notes: data.notes || null,
      });

      // Create sale items and update inventory
      for (const detail of itemDetails) {
        await storage.createSaleItem({
          saleId: sale.id,
          productId: detail.item.productId,
          itemId: detail.item.id,
          imei: detail.item.imei,
          purchasePrice: detail.item.purchasePrice,
          unitPrice: detail.unitPrice,
          totalPrice: detail.unitPrice,
          profit: detail.profit,
        });

        // Update item status to sold
        await storage.updateItem(detail.item.id, {
          status: "sold",
          salePrice: detail.unitPrice,
          saleId: sale.id,
          customerId: data.customerId || null,
          soldAt: new Date(),
        });
      }

      // Update customer balance if not walk-in and has balance impact
      if (data.customerId && balanceImpact > 0) {
        const customer = await storage.getCustomer(data.customerId);
        if (customer) {
          await storage.updateCustomer(data.customerId, {
            balance: (customer.balance || 0) + balanceImpact,
          });
        }
      }

      res.status(201).json(sale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to create sale" });
    }
  });

  // ============ PURCHASE INVOICES ============
  app.get("/api/purchase-invoices", async (req, res) => {
    try {
      const invoices = await storage.getPurchaseInvoices();
      
      // Enrich with supplier data
      const suppliers = await storage.getSuppliers();
      const supplierMap = new Map(suppliers.map(s => [s.id, s]));
      
      const enrichedInvoices = await Promise.all(invoices.map(async invoice => {
        const invoiceItems = await storage.getPurchaseInvoiceItems(invoice.id);
        const products = await storage.getProducts();
        const productMap = new Map(products.map(p => [p.id, p]));
        
        return {
          ...invoice,
          supplier: supplierMap.get(invoice.supplierId),
          items: invoiceItems.map(item => ({
            ...item,
            product: productMap.get(item.productId),
          })),
        };
      }));

      res.json(enrichedInvoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch purchase invoices" });
    }
  });

  app.get("/api/purchase-invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getPurchaseInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      
      const supplier = await storage.getSupplier(invoice.supplierId);
      const invoiceItems = await storage.getPurchaseInvoiceItems(invoice.id);
      const products = await storage.getProducts();
      const productMap = new Map(products.map(p => [p.id, p]));
      
      res.json({
        ...invoice,
        supplier,
        items: invoiceItems.map(item => ({
          ...item,
          product: productMap.get(item.productId),
        })),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  // Create purchase invoice with items
  const createPurchaseInvoiceSchema = z.object({
    supplierId: z.string(),
    subtotal: z.number(),
    discountAmount: z.number().optional(),
    totalAmount: z.number(),
    paidAmount: z.number().optional(),
    paymentType: z.string(),
    notes: z.string().optional(),
    items: z.array(z.object({
      productId: z.string(),
      imei: z.string(),
      unitPrice: z.number(),
    })),
  });

  app.post("/api/purchase-invoices", requirePermission("purchases:write"), async (req, res) => {
    try {
      const data = createPurchaseInvoiceSchema.parse(req.body);
      
      // Generate invoice number
      const invoices = await storage.getPurchaseInvoices();
      const invoiceNumber = `PI${String(invoices.length + 1).padStart(6, "0")}`;
      
      const balanceImpact = data.totalAmount - (data.paidAmount || 0);

      // Create the invoice
      const invoice = await storage.createPurchaseInvoice({
        invoiceNumber,
        supplierId: data.supplierId,
        subtotal: data.subtotal,
        discountAmount: data.discountAmount || 0,
        totalAmount: data.totalAmount,
        paidAmount: data.paidAmount || 0,
        balanceImpact,
        paymentType: data.paymentType,
        notes: data.notes || null,
      });

      // Create items in inventory and invoice items
      for (const itemData of data.items) {
        // Check for duplicate IMEI
        const existingItem = await storage.getItemByImei(itemData.imei);
        if (existingItem) {
          throw new Error(`IMEI already exists: ${itemData.imei}`);
        }

        // Create the inventory item
        const item = await storage.createItem({
          productId: itemData.productId,
          imei: itemData.imei,
          status: "available",
          purchasePrice: itemData.unitPrice,
          purchaseInvoiceId: invoice.id,
          supplierId: data.supplierId,
          purchasedAt: new Date(),
        });

        // Create the invoice item
        await storage.createPurchaseInvoiceItem({
          invoiceId: invoice.id,
          productId: itemData.productId,
          itemId: item.id,
          imei: itemData.imei,
          unitPrice: itemData.unitPrice,
          totalPrice: itemData.unitPrice,
        });
      }

      // Update supplier balance
      if (balanceImpact > 0) {
        const supplier = await storage.getSupplier(data.supplierId);
        if (supplier) {
          await storage.updateSupplier(data.supplierId, {
            balance: (supplier.balance || 0) + balanceImpact,
          });
        }
      }

      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to create purchase invoice" });
    }
  });

  // ============ PAYMENTS ============
  app.get("/api/payments", async (req, res) => {
    try {
      const payments = await storage.getPayments();
      
      // Enrich with entity data
      const customers = await storage.getCustomers();
      const suppliers = await storage.getSuppliers();
      const customerMap = new Map(customers.map(c => [c.id, c]));
      const supplierMap = new Map(suppliers.map(s => [s.id, s]));
      
      const enrichedPayments = payments.map(payment => ({
        ...payment,
        entity: payment.type === "customer" 
          ? customerMap.get(payment.entityId)
          : supplierMap.get(payment.entityId),
      }));

      res.json(enrichedPayments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", requirePermission("payments:write"), async (req, res) => {
    try {
      const data = insertPaymentSchema.parse(req.body);
      
      // Get active cash register session
      const activeSession = await storage.getActiveCashRegisterSession();
      
      const payment = await storage.createPayment({
        ...data,
        cashRegisterSessionId: activeSession?.id || null,
      });

      // Update entity balance
      if (data.type === "customer") {
        const customer = await storage.getCustomer(data.entityId);
        if (customer) {
          await storage.updateCustomer(data.entityId, {
            balance: (customer.balance || 0) - data.amount,
          });
        }
      } else if (data.type === "supplier") {
        const supplier = await storage.getSupplier(data.entityId);
        if (supplier) {
          await storage.updateSupplier(data.entityId, {
            balance: (supplier.balance || 0) - data.amount,
          });
        }
      }

      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  // ============ CASH REGISTER ============
  app.get("/api/cash-register", async (req, res) => {
    try {
      const sessions = await storage.getCashRegisterSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/cash-register/active", async (req, res) => {
    try {
      const session = await storage.getActiveCashRegisterSession();
      res.json(session || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active session" });
    }
  });

  app.post("/api/cash-register", requirePermission("cash_register:write"), async (req, res) => {
    try {
      // Check if there's already an active session
      const activeSession = await storage.getActiveCashRegisterSession();
      if (activeSession) {
        return res.status(400).json({ error: "There is already an open session" });
      }

      const sessions = await storage.getCashRegisterSessions();
      const sessionNumber = `CR${String(sessions.length + 1).padStart(6, "0")}`;

      const data = insertCashRegisterSessionSchema.parse({
        ...req.body,
        sessionNumber,
        openedBy: req.body.openedBy || "admin",
      });

      const session = await storage.createCashRegisterSession(data);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.post("/api/cash-register/:id/close", requirePermission("cash_register:write"), async (req, res) => {
    try {
      const session = await storage.getCashRegisterSession(req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      if (session.status !== "open") {
        return res.status(400).json({ error: "Session is already closed" });
      }

      const { actualBalance, notes } = req.body;

      // Calculate expected balance based on transactions
      const sales = await storage.getSales();
      const payments = await storage.getPayments();
      const expenses = await storage.getExpenses();

      const sessionSales = sales.filter(s => s.cashRegisterSessionId === session.id);
      const sessionPayments = payments.filter(p => p.cashRegisterSessionId === session.id);
      const sessionExpenses = expenses.filter(e => e.cashRegisterSessionId === session.id);

      const salesCash = sessionSales
        .filter(s => s.paymentMethod === "cash")
        .reduce((sum, s) => sum + (s.paidAmount ?? 0), 0);
      
      const paymentsCash = sessionPayments
        .filter(p => p.paymentMethod === "cash")
        .reduce((sum, p) => sum + p.amount, 0);
      
      const expensesCash = sessionExpenses
        .filter(e => e.paymentMethod === "cash")
        .reduce((sum, e) => sum + e.amount, 0);

      const expectedBalance = session.openingBalance + salesCash + paymentsCash - expensesCash;
      const difference = (actualBalance || expectedBalance) - expectedBalance;

      const updatedSession = await storage.updateCashRegisterSession(session.id, {
        status: "closed",
        closedAt: new Date(),
        closedBy: req.body.closedBy || "admin",
        closingBalance: actualBalance || expectedBalance,
        expectedBalance,
        actualBalance: actualBalance || expectedBalance,
        difference,
        notes: notes || null,
      });

      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ error: "Failed to close session" });
    }
  });

  // ============ EXPENSES ============
  app.get("/api/expenses", async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", requirePermission("expenses:write"), async (req, res) => {
    try {
      const data = insertExpenseSchema.parse(req.body);
      
      // Get active cash register session
      const activeSession = await storage.getActiveCashRegisterSession();
      
      const expense = await storage.createExpense({
        ...data,
        cashRegisterSessionId: activeSession?.id || null,
      });
      
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      await storage.deleteExpense(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // ============ CURRENCIES ============
  app.get("/api/currencies", async (req, res) => {
    try {
      const currencies = await storage.getCurrencies();
      res.json(currencies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch currencies" });
    }
  });

  app.get("/api/currencies/default", async (req, res) => {
    try {
      const currency = await storage.getDefaultCurrency();
      if (!currency) {
        return res.status(404).json({ error: "No default currency set" });
      }
      res.json(currency);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch default currency" });
    }
  });

  app.get("/api/currencies/:id", async (req, res) => {
    try {
      const currency = await storage.getCurrency(req.params.id);
      if (!currency) return res.status(404).json({ error: "Currency not found" });
      res.json(currency);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch currency" });
    }
  });

  app.post("/api/currencies", requirePermission("settings:write"), async (req, res) => {
    try {
      const data = insertCurrencySchema.parse(req.body);
      const currency = await storage.createCurrency(data);
      res.status(201).json(currency);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create currency" });
    }
  });

  app.patch("/api/currencies/:id", requirePermission("settings:write"), async (req, res) => {
    try {
      const data = insertCurrencySchema.partial().parse(req.body);
      const currency = await storage.updateCurrency(req.params.id, data);
      res.json(currency);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update currency" });
    }
  });

  app.post("/api/currencies/:id/set-default", requirePermission("settings:write"), async (req, res) => {
    try {
      const currency = await storage.setDefaultCurrency(req.params.id);
      res.json(currency);
    } catch (error) {
      res.status(500).json({ error: "Failed to set default currency" });
    }
  });

  app.delete("/api/currencies/:id", requirePermission("settings:write"), async (req, res) => {
    try {
      const currency = await storage.getCurrency(req.params.id);
      if (currency?.isDefault) {
        return res.status(400).json({ error: "Cannot delete default currency" });
      }
      await storage.deleteCurrency(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete currency" });
    }
  });

  // ============ SETTINGS ============
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch setting" });
    }
  });

  app.post("/api/settings/:key", requirePermission("settings:write"), async (req, res) => {
    try {
      const { value } = req.body;
      if (typeof value !== "string") {
        return res.status(400).json({ error: "Value must be a string" });
      }
      const setting = await storage.setSetting(req.params.key, value);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  // ============ DASHBOARD ============
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const sales = await storage.getSales();
      const items = await storage.getItems();
      const customers = await storage.getCustomers();
      const suppliers = await storage.getSuppliers();
      const purchases = await storage.getPurchaseInvoices();

      // Calculate totals
      const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
      
      // Calculate inventory value from available items
      const availableItems = items.filter(i => i.status === "available");
      const inventoryValue = availableItems.reduce((sum, i) => sum + i.purchasePrice, 0);
      const inventoryCount = availableItems.length;
      
      // Outstanding balances
      const outstandingCustomerBalance = customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0);
      const outstandingSupplierBalance = suppliers.reduce((sum, s) => sum + Math.max(0, s.balance || 0), 0);

      res.json({
        totalSales,
        totalProfit,
        inventoryValue,
        inventoryCount,
        outstandingCustomerBalance,
        outstandingSupplierBalance,
        salesCount: sales.length,
        purchaseCount: purchases.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/activity", async (req, res) => {
    try {
      const sales = await storage.getSales();
      const payments = await storage.getPayments();
      const purchases = await storage.getPurchaseInvoices();

      // Get recent activity (last 10 items combined)
      const activities = [
        ...sales.map(s => ({ type: "sale", data: s, date: s.date })),
        ...payments.map(p => ({ type: "payment", data: p, date: p.date })),
        ...purchases.map(p => ({ type: "purchase", data: p, date: p.date })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  // Weekly sales chart data
  app.get("/api/dashboard/weekly-sales", async (req, res) => {
    try {
      const sales = await storage.getSales();
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const dailySales: Record<string, { revenue: number; profit: number; count: number }> = {};

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekAgo);
        date.setDate(date.getDate() + i + 1);
        const key = date.toISOString().split("T")[0];
        dailySales[key] = { revenue: 0, profit: 0, count: 0 };
      }

      sales.forEach(sale => {
        const saleDate = new Date(sale.date);
        if (saleDate >= weekAgo && saleDate <= today) {
          const key = saleDate.toISOString().split("T")[0];
          if (dailySales[key]) {
            dailySales[key].revenue += sale.totalAmount;
            dailySales[key].profit += sale.profit;
            dailySales[key].count += 1;
          }
        }
      });

      const chartData = Object.entries(dailySales).map(([date, data]) => ({
        date,
        day: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
        revenue: data.revenue / 100,
        profit: data.profit / 100,
        sales: data.count,
      }));

      res.json(chartData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch weekly sales" });
    }
  });

  // === REPORTS API ===

  // Reports summary with date range
  app.get("/api/reports/summary", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);

      const sales = await storage.getSales();
      const purchases = await storage.getPurchaseInvoices();
      const payments = await storage.getPayments();
      const expenses = await storage.getExpenses();

      // Filter by date range
      const filteredSales = sales.filter(s => {
        const d = new Date(s.date);
        return d >= start && d <= end;
      });

      const filteredPurchases = purchases.filter(p => {
        const d = new Date(p.date);
        return d >= start && d <= end;
      });

      const filteredPayments = payments.filter(p => {
        const d = new Date(p.date);
        return d >= start && d <= end;
      });

      const filteredExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      });

      const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalProfit = filteredSales.reduce((sum, s) => sum + s.profit, 0);
      const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
      const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
      const customerPayments = filteredPayments.filter(p => p.partyType === "customer").reduce((sum, p) => sum + p.amount, 0);
      const supplierPayments = filteredPayments.filter(p => p.partyType === "supplier").reduce((sum, p) => sum + p.amount, 0);
      const netCashFlow = customerPayments - supplierPayments - totalExpenses;

      res.json({
        totalRevenue,
        totalProfit,
        totalPurchases,
        totalExpenses,
        customerPayments,
        supplierPayments,
        netCashFlow,
        salesCount: filteredSales.length,
        purchaseCount: filteredPurchases.length,
        expenseCount: filteredExpenses.length,
        profitMargin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch report summary" });
    }
  });

  // Sales trends by day/week/month
  app.get("/api/reports/sales-trends", async (req, res) => {
    try {
      const { startDate, endDate, groupBy = "day" } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);

      const sales = await storage.getSales();

      const filteredSales = sales.filter(s => {
        const d = new Date(s.date);
        return d >= start && d <= end;
      });

      const groupedData: Record<string, { revenue: number; profit: number; count: number }> = {};

      filteredSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        let key: string;
        
        if (groupBy === "week") {
          const weekStart = new Date(saleDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = weekStart.toISOString().split("T")[0];
        } else if (groupBy === "month") {
          key = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}`;
        } else {
          key = saleDate.toISOString().split("T")[0];
        }

        if (!groupedData[key]) {
          groupedData[key] = { revenue: 0, profit: 0, count: 0 };
        }
        groupedData[key].revenue += sale.totalAmount;
        groupedData[key].profit += sale.profit;
        groupedData[key].count += 1;
      });

      const chartData = Object.entries(groupedData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          label: groupBy === "month" 
            ? new Date(date + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" })
            : new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          revenue: data.revenue,
          profit: data.profit,
          count: data.count,
        }));

      res.json(chartData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales trends" });
    }
  });

  // Top products by profit/sales
  app.get("/api/reports/top-products", async (req, res) => {
    try {
      const { startDate, endDate, limit = "10", sortBy = "profit" } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);

      const sales = await storage.getSales();
      const items = await storage.getItems();
      const products = await storage.getProducts();

      // Filter sales by date
      const filteredSales = sales.filter(s => {
        const d = new Date(s.date);
        return d >= start && d <= end;
      });

      const saleIds = new Set(filteredSales.map(s => s.id));

      // Get sold items from filtered sales
      const soldItems = items.filter(i => i.saleId && saleIds.has(i.saleId));

      // Aggregate by product
      const productStats: Record<string, { productId: string; revenue: number; profit: number; count: number }> = {};

      soldItems.forEach(item => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = { productId: item.productId, revenue: 0, profit: 0, count: 0 };
        }
        productStats[item.productId].revenue += item.salePrice || 0;
        productStats[item.productId].profit += (item.salePrice || 0) - item.purchasePrice;
        productStats[item.productId].count += 1;
      });

      const productsMap = new Map(products.map(p => [p.id, p]));

      const result = Object.values(productStats)
        .sort((a, b) => sortBy === "profit" ? b.profit - a.profit : b.revenue - a.revenue)
        .slice(0, parseInt(limit as string))
        .map(stat => ({
          ...stat,
          product: productsMap.get(stat.productId),
        }));

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top products" });
    }
  });

  // Top customers by spending
  app.get("/api/reports/top-customers", async (req, res) => {
    try {
      const { startDate, endDate, limit = "10" } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);

      const sales = await storage.getSales();
      const customers = await storage.getCustomers();

      const filteredSales = sales.filter(s => {
        const d = new Date(s.date);
        return d >= start && d <= end && s.customerId;
      });

      const customerStats: Record<string, { customerId: string; revenue: number; profit: number; count: number }> = {};

      filteredSales.forEach(sale => {
        if (!sale.customerId) return;
        if (!customerStats[sale.customerId]) {
          customerStats[sale.customerId] = { customerId: sale.customerId, revenue: 0, profit: 0, count: 0 };
        }
        customerStats[sale.customerId].revenue += sale.totalAmount;
        customerStats[sale.customerId].profit += sale.profit;
        customerStats[sale.customerId].count += 1;
      });

      const customersMap = new Map(customers.map(c => [c.id, c]));

      const result = Object.values(customerStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, parseInt(limit as string))
        .map(stat => ({
          ...stat,
          customer: customersMap.get(stat.customerId),
        }));

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top customers" });
    }
  });

  // Supplier purchase analysis
  app.get("/api/reports/supplier-analysis", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);

      const purchases = await storage.getPurchaseInvoices();
      const suppliers = await storage.getSuppliers();

      const filteredPurchases = purchases.filter(p => {
        const d = new Date(p.date);
        return d >= start && d <= end;
      });

      const supplierStats: Record<string, { supplierId: string; totalPurchases: number; itemCount: number; invoiceCount: number }> = {};

      filteredPurchases.forEach(purchase => {
        if (!supplierStats[purchase.supplierId]) {
          supplierStats[purchase.supplierId] = { supplierId: purchase.supplierId, totalPurchases: 0, itemCount: 0, invoiceCount: 0 };
        }
        supplierStats[purchase.supplierId].totalPurchases += purchase.totalAmount;
        supplierStats[purchase.supplierId].invoiceCount += 1;
      });

      const suppliersMap = new Map(suppliers.map(s => [s.id, s]));

      const result = Object.values(supplierStats)
        .sort((a, b) => b.totalPurchases - a.totalPurchases)
        .map(stat => ({
          ...stat,
          supplier: suppliersMap.get(stat.supplierId),
        }));

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supplier analysis" });
    }
  });

  // Payment trends
  app.get("/api/reports/payment-trends", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);

      const payments = await storage.getPayments();

      const filteredPayments = payments.filter(p => {
        const d = new Date(p.date);
        return d >= start && d <= end;
      });

      const dailyPayments: Record<string, { incoming: number; outgoing: number }> = {};

      filteredPayments.forEach(payment => {
        const key = new Date(payment.date).toISOString().split("T")[0];
        if (!dailyPayments[key]) {
          dailyPayments[key] = { incoming: 0, outgoing: 0 };
        }
        if (payment.partyType === "customer") {
          dailyPayments[key].incoming += payment.amount;
        } else {
          dailyPayments[key].outgoing += payment.amount;
        }
      });

      const chartData = Object.entries(dailyPayments)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          label: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          incoming: data.incoming,
          outgoing: data.outgoing,
          net: data.incoming - data.outgoing,
        }));

      res.json(chartData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment trends" });
    }
  });

  // Expenses by category
  app.get("/api/reports/expenses-by-category", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);

      const expenses = await storage.getExpenses();

      const filteredExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      });

      const categoryTotals: Record<string, number> = {};

      filteredExpenses.forEach(expense => {
        const category = expense.category || "Uncategorized";
        categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
      });

      const result = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: Math.round((amount / filteredExpenses.reduce((sum, e) => sum + e.amount, 0)) * 100) || 0,
        }));

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses by category" });
    }
  });

  return httpServer;
}
