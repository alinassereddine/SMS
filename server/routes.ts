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
  updateSaleFullSchema,
  updatePurchaseInvoiceFullSchema,
  updatePaymentSchema,
  updateCashRegisterSessionDateSchema,
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

  app.post("/api/customers/:id/restore", requirePermission("customers:write"), async (req, res) => {
    try {
      await storage.restoreCustomer(req.params.id);
      res.status(200).json({ message: "Customer restored" });
    } catch (error) {
      res.status(500).json({ error: "Failed to restore customer" });
    }
  });

  app.delete("/api/customers/:id/hard-delete", requirePermission("customers:delete"), async (req, res) => {
    try {
      await storage.hardDeleteCustomer(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to permanently delete customer" });
    }
  });

  // Customer summary with sales, payments, and balance ledger
  app.get("/api/customers/:id/summary", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) return res.status(404).json({ error: "Customer not found" });

      // Get all sales for this customer
      const allSales = await storage.getSales();
      const customerSales = allSales
        .filter(s => s.customerId === req.params.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Get sale items for each sale
      const allItems = await storage.getItems();
      const allProducts = await storage.getProducts();
      
      const salesWithItems = await Promise.all(customerSales.map(async (sale) => {
        const saleItems = await storage.getSaleItems(sale.id);
        const items = saleItems.map(si => {
          const item = allItems.find(i => i.id === si.itemId);
          const product = item ? allProducts.find(p => p.id === item.productId) : null;
          return {
            ...si,
            imei: item?.imei || "",
            product: product || null,
          };
        });
        return { ...sale, items, itemCount: items.length };
      }));

      // Get all payments for this customer
      const payments = await storage.getPaymentsByEntity("customer", req.params.id);
      const sortedPayments = payments.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Build balance ledger (chronological transactions)
      type LedgerEntry = {
        id: string;
        date: string;
        type: "sale" | "payment";
        description: string;
        debit: number;  // increases balance (what customer owes)
        credit: number; // decreases balance (what customer paid)
        runningBalance: number;
        referenceId: string;
      };

      const ledgerEntries: Omit<LedgerEntry, "runningBalance">[] = [];

      // Add sales as debits (customer owes the unpaid portion)
      for (const sale of customerSales) {
        const unpaidAmount = sale.totalAmount - (sale.paidAmount || 0);
        if (unpaidAmount > 0) {
          ledgerEntries.push({
            id: `sale-${sale.id}`,
            date: String(sale.date),
            type: "sale",
            description: `Sale ${sale.saleNumber}`,
            debit: unpaidAmount,
            credit: 0,
            referenceId: sale.id,
          });
        }
      }

      // Add payments/refunds (payments reduce what customer owes, refunds increase)
      for (const payment of payments) {
        const isRefund = payment.transactionType === "refund";
        const typeLabel = isRefund ? "Refund" : "Payment";
        ledgerEntries.push({
          id: `payment-${payment.id}`,
          date: String(payment.date),
          type: "payment",
          description: `${typeLabel} - ${payment.paymentMethod}${payment.reference ? ` (${payment.reference})` : ""}`,
          // Payment from customer = credit (reduces balance)
          // Refund to customer = debit (increases balance - we give money back, they owe more)
          debit: isRefund ? payment.amount : 0,
          credit: isRefund ? 0 : payment.amount,
          referenceId: payment.id,
        });
      }

      // Sort by date ascending for running balance calculation
      ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance
      let runningBalance = 0;
      const ledger: LedgerEntry[] = ledgerEntries.map(entry => {
        runningBalance += entry.debit - entry.credit;
        return { ...entry, runningBalance };
      });

      // Reverse for display (most recent first)
      ledger.reverse();

      res.json({
        customer,
        sales: salesWithItems,
        payments: sortedPayments,
        ledger,
        totalSales: customerSales.length,
        totalPayments: payments.length,
      });
    } catch (error) {
      console.error("Error fetching customer summary:", error);
      res.status(500).json({ error: "Failed to fetch customer summary" });
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

  app.post("/api/suppliers/:id/restore", requirePermission("suppliers:write"), async (req, res) => {
    try {
      await storage.restoreSupplier(req.params.id);
      res.status(200).json({ message: "Supplier restored" });
    } catch (error) {
      res.status(500).json({ error: "Failed to restore supplier" });
    }
  });

  app.delete("/api/suppliers/:id/hard-delete", requirePermission("suppliers:delete"), async (req, res) => {
    try {
      await storage.hardDeleteSupplier(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to permanently delete supplier" });
    }
  });

  // Supplier summary with purchases, payments, and balance ledger
  app.get("/api/suppliers/:id/summary", async (req, res) => {
    try {
      const supplier = await storage.getSupplier(req.params.id);
      if (!supplier) return res.status(404).json({ error: "Supplier not found" });

      // Get all purchases for this supplier
      const allPurchases = await storage.getPurchaseInvoices();
      const supplierPurchases = allPurchases
        .filter(p => p.supplierId === req.params.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Get purchase items for each purchase
      const allItems = await storage.getItems();
      const allProducts = await storage.getProducts();
      
      const purchasesWithItems = await Promise.all(supplierPurchases.map(async (purchase) => {
        const purchaseItems = await storage.getPurchaseInvoiceItems(purchase.id);
        const items = purchaseItems.map(pi => {
          const item = allItems.find(i => i.id === pi.itemId);
          const product = item ? allProducts.find(p => p.id === item.productId) : null;
          return {
            ...pi,
            imei: item?.imei || "",
            product: product || null,
          };
        });
        return { ...purchase, items, itemCount: items.length };
      }));

      // Get all payments for this supplier
      const payments = await storage.getPaymentsByEntity("supplier", req.params.id);
      const sortedPayments = payments.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Build balance ledger (chronological transactions)
      type LedgerEntry = {
        id: string;
        date: string;
        type: "purchase" | "payment";
        description: string;
        debit: number;  // increases balance (what we owe supplier)
        credit: number; // decreases balance (what we paid)
        runningBalance: number;
        referenceId: string;
      };

      const ledgerEntries: Omit<LedgerEntry, "runningBalance">[] = [];

      // Add purchases as debits (we owe the unpaid portion)
      for (const purchase of supplierPurchases) {
        const unpaidAmount = purchase.totalAmount - (purchase.paidAmount || 0);
        if (unpaidAmount > 0) {
          ledgerEntries.push({
            id: `purchase-${purchase.id}`,
            date: String(purchase.date),
            type: "purchase",
            description: `Purchase ${purchase.invoiceNumber}`,
            debit: unpaidAmount,
            credit: 0,
            referenceId: purchase.id,
          });
        }
      }

      // Add payments/refunds
      // Payment to supplier = credit (reduces what we owe)
      // Refund from supplier = also credit (they return money, reduces what we owe)
      for (const payment of payments) {
        const isRefund = payment.transactionType === "refund";
        const typeLabel = isRefund ? "Refund" : "Payment";
        ledgerEntries.push({
          id: `payment-${payment.id}`,
          date: String(payment.date),
          type: "payment",
          description: `${typeLabel} - ${payment.paymentMethod}${payment.reference ? ` (${payment.reference})` : ""}`,
          debit: 0,
          credit: payment.amount,
          referenceId: payment.id,
        });
      }

      // Sort by date ascending for running balance calculation
      ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance
      let runningBalance = 0;
      const ledger: LedgerEntry[] = ledgerEntries.map(entry => {
        runningBalance += entry.debit - entry.credit;
        return { ...entry, runningBalance };
      });

      // Reverse for display (most recent first)
      ledger.reverse();

      res.json({
        supplier,
        purchases: purchasesWithItems,
        payments: sortedPayments,
        ledger,
        totalPurchases: supplierPurchases.length,
        totalPayments: payments.length,
      });
    } catch (error) {
      console.error("Error fetching supplier summary:", error);
      res.status(500).json({ error: "Failed to fetch supplier summary" });
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
      
      // Check for active cash register session
      const activeSession = await storage.getActiveCashRegisterSession();
      if (!activeSession) {
        return res.status(400).json({ error: "No open cash register session. Please open a session first." });
      }
      
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

  app.delete("/api/sales/:id", requirePermission("sales:delete"), async (req, res) => {
    try {
      const sale = await storage.getSale(req.params.id);
      if (!sale) return res.status(404).json({ error: "Sale not found" });

      if (sale.cashRegisterSessionId) {
        const session = await storage.getCashRegisterSession(sale.cashRegisterSessionId);
        if (session && session.status === "closed") {
          return res.status(400).json({ 
            error: "Cannot delete: Sale is linked to a closed cash register session" 
          });
        }
      }

      if (sale.customerId && sale.balanceImpact > 0) {
        const customer = await storage.getCustomer(sale.customerId);
        if (customer && (customer.balance || 0) < sale.balanceImpact) {
          return res.status(400).json({ 
            error: "Cannot delete: Customer has made payments against this sale. The remaining balance is less than the original amount owed." 
          });
        }
      }

      const saleItems = await storage.getSaleItems(sale.id);

      for (const saleItem of saleItems) {
        if (saleItem.itemId) {
          await storage.updateItem(saleItem.itemId, {
            status: "available",
            salePrice: null,
            saleId: null,
            customerId: null,
            soldAt: null,
          });
        }
      }

      if (sale.customerId && sale.balanceImpact > 0) {
        const customer = await storage.getCustomer(sale.customerId);
        if (customer) {
          await storage.updateCustomer(sale.customerId, {
            balance: Math.max(0, (customer.balance || 0) - sale.balanceImpact),
          });
        }
      }

      await storage.deleteSaleItems(sale.id);
      await storage.deleteSale(sale.id);

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete sale" });
    }
  });

  app.post("/api/sales/:id/restore", requirePermission("sales:write"), async (req, res) => {
    try {
      await storage.restoreSale(req.params.id);
      res.status(200).json({ message: "Sale restored" });
    } catch (error) {
      res.status(500).json({ error: "Failed to restore sale" });
    }
  });

  app.delete("/api/sales/:id/hard-delete", requirePermission("sales:delete"), async (req, res) => {
    try {
      await storage.hardDeleteSale(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to permanently delete sale" });
    }
  });

  // Update sale (notes and discount only)
  const updateSaleSchema = z.object({
    discountAmount: z.number().optional(),
    notes: z.string().nullable().optional(),
  });

  app.patch("/api/sales/:id", requirePermission("sales:write"), async (req, res) => {
    try {
      const sale = await storage.getSale(req.params.id);
      if (!sale) return res.status(404).json({ error: "Sale not found" });

      if (sale.cashRegisterSessionId) {
        const session = await storage.getCashRegisterSession(sale.cashRegisterSessionId);
        if (session && session.status === "closed") {
          return res.status(400).json({ 
            error: "Cannot edit: Sale is linked to a closed cash register session" 
          });
        }
      }

      const data = updateSaleSchema.parse(req.body);
      
      // Recalculate totals if discount changed
      let updateData: Record<string, unknown> = { ...data };
      if (data.discountAmount !== undefined && data.discountAmount !== sale.discountAmount) {
        // Validate discount doesn't exceed subtotal
        if (data.discountAmount > sale.subtotal) {
          return res.status(400).json({ error: "Discount cannot exceed subtotal" });
        }
        
        const newTotal = sale.subtotal - data.discountAmount;
        const paidAmount = sale.paidAmount || 0;
        const newBalanceImpact = Math.max(0, newTotal - paidAmount);
        
        // Recalculate payment type
        let newPaymentType = "credit";
        if (paidAmount >= newTotal) {
          newPaymentType = "full";
        } else if (paidAmount > 0) {
          newPaymentType = "partial";
        }
        
        // If balance changed and customer exists, update customer balance
        if (sale.customerId && newBalanceImpact !== sale.balanceImpact) {
          const customer = await storage.getCustomer(sale.customerId);
          if (customer) {
            const balanceDiff = newBalanceImpact - sale.balanceImpact;
            await storage.updateCustomer(sale.customerId, {
              balance: Math.max(0, (customer.balance || 0) + balanceDiff),
            });
          }
        }
        
        // Ensure profit doesn't go negative
        const profitReduction = data.discountAmount - (sale.discountAmount || 0);
        const newProfit = Math.max(0, sale.profit - profitReduction);
        
        updateData.totalAmount = newTotal;
        updateData.balanceImpact = newBalanceImpact;
        updateData.paymentType = newPaymentType;
        updateData.profit = newProfit;
      }

      const updated = await storage.updateSale(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update sale" });
    }
  });

  // Comprehensive sale edit (items, prices, paid amount)
  app.put("/api/sales/:id", requirePermission("sales:write"), async (req, res) => {
    try {
      // Get existing sale
      const sale = await storage.getSale(req.params.id);
      if (!sale) return res.status(404).json({ error: "Sale not found" });

      // Check cash register session
      if (sale.cashRegisterSessionId) {
        const session = await storage.getCashRegisterSession(sale.cashRegisterSessionId);
        if (session && session.status === "closed") {
          return res.status(400).json({ 
            error: "Cannot edit: Sale is linked to a closed cash register session" 
          });
        }
      }

      // Validate input
      const data = updateSaleFullSchema.parse(req.body);
      
      // Get current sale items
      const currentSaleItems = await storage.getSaleItems(sale.id);
      const currentItemIds = new Set(currentSaleItems.map(si => si.itemId));
      const newItemIds = new Set(data.items.map(i => i.itemId));
      
      // Determine items to remove and add
      const itemsToRemove = currentSaleItems.filter(si => !newItemIds.has(si.itemId));
      const itemsToAdd = data.items.filter(i => !currentItemIds.has(i.itemId));
      const itemsToUpdate = data.items.filter(i => currentItemIds.has(i.itemId));
      
      // Validate all new items are available
      for (const itemToAdd of itemsToAdd) {
        const item = await storage.getItem(itemToAdd.itemId);
        if (!item) {
          return res.status(400).json({ error: `Item ${itemToAdd.itemId} not found` });
        }
        if (item.status !== "available") {
          return res.status(400).json({ 
            error: `Item with IMEI ${item.imei} is not available (status: ${item.status})` 
          });
        }
      }
      
      // Check customer requirement for credit/partial payments
      const discountAmount = data.discountAmount ?? sale.discountAmount ?? 0;
      
      // Calculate new subtotal and totals from items
      let newSubtotal = 0;
      let newProfit = 0;
      const itemDataMap = new Map(data.items.map(i => [i.itemId, i]));
      
      // Process all items (both existing and new)
      for (const itemData of data.items) {
        const item = await storage.getItem(itemData.itemId);
        if (!item) {
          return res.status(400).json({ error: `Item ${itemData.itemId} not found` });
        }
        newSubtotal += itemData.unitPrice;
        newProfit += itemData.unitPrice - item.purchasePrice;
      }
      
      // Validate discount
      if (discountAmount > newSubtotal) {
        return res.status(400).json({ error: "Discount cannot exceed subtotal" });
      }
      
      const newTotal = newSubtotal - discountAmount;
      const newPaidAmount = data.paidAmount ?? sale.paidAmount ?? 0;
      
      // Validate paid amount
      if (newPaidAmount > newTotal) {
        return res.status(400).json({ error: "Paid amount cannot exceed total" });
      }
      
      const newBalanceImpact = Math.max(0, newTotal - newPaidAmount);
      
      // Check customer requirement for credit/partial
      if (newBalanceImpact > 0 && !data.customerId && !sale.customerId) {
        return res.status(400).json({ 
          error: "Customer is required for partial/credit sales" 
        });
      }
      
      // Determine payment type
      let newPaymentType = "credit";
      if (newPaidAmount >= newTotal) {
        newPaymentType = "full";
      } else if (newPaidAmount > 0) {
        newPaymentType = "partial";
      }
      
      // Ensure profit is not negative
      newProfit = Math.max(0, newProfit);
      
      // ---- Begin updates ----
      
      // 1. Release removed items (set status back to available)
      for (const saleItem of itemsToRemove) {
        await storage.updateItem(saleItem.itemId, {
          status: "available",
          saleId: null,
          salePrice: null,
          customerId: null,
          soldAt: null,
        });
      }
      
      // 2. Mark new items as sold
      const customerId = data.customerId !== undefined ? data.customerId : sale.customerId;
      for (const itemToAdd of itemsToAdd) {
        const item = await storage.getItem(itemToAdd.itemId);
        if (item) {
          await storage.updateItem(itemToAdd.itemId, {
            status: "sold",
            saleId: sale.id,
            salePrice: itemToAdd.unitPrice,
            customerId: customerId,
            soldAt: new Date(),
          });
        }
      }
      
      // 3. Update prices on existing items
      for (const itemData of itemsToUpdate) {
        const item = await storage.getItem(itemData.itemId);
        if (item && item.salePrice !== itemData.unitPrice) {
          await storage.updateItem(itemData.itemId, {
            salePrice: itemData.unitPrice,
          });
        }
      }
      
      // 4. Delete old sale items and create new ones
      await storage.deleteSaleItems(sale.id);
      
      for (const itemData of data.items) {
        const item = await storage.getItem(itemData.itemId);
        if (item) {
          const product = await storage.getProduct(item.productId);
          await storage.createSaleItem({
            saleId: sale.id,
            productId: item.productId,
            itemId: item.id,
            imei: item.imei,
            quantity: 1,
            purchasePrice: item.purchasePrice,
            unitPrice: itemData.unitPrice,
            totalPrice: itemData.unitPrice,
            profit: Math.max(0, itemData.unitPrice - item.purchasePrice),
          });
        }
      }
      
      // 5. Update customer balance
      const oldCustomerId = sale.customerId;
      const newCustomerId = data.customerId !== undefined ? data.customerId : sale.customerId;
      
      // Remove balance from old customer if exists
      if (oldCustomerId && sale.balanceImpact > 0) {
        const oldCustomer = await storage.getCustomer(oldCustomerId);
        if (oldCustomer) {
          await storage.updateCustomer(oldCustomerId, {
            balance: Math.max(0, (oldCustomer.balance || 0) - sale.balanceImpact),
          });
        }
      }
      
      // Add balance to new customer if exists
      if (newCustomerId && newBalanceImpact > 0) {
        const newCustomer = await storage.getCustomer(newCustomerId);
        if (newCustomer) {
          await storage.updateCustomer(newCustomerId, {
            balance: (newCustomer.balance || 0) + newBalanceImpact,
          });
        }
      }
      
      // 6. Update sale record
      const updatedSale = await storage.updateSale(sale.id, {
        customerId: newCustomerId,
        date: data.date ? new Date(data.date) : sale.date,
        subtotal: newSubtotal,
        discountAmount: discountAmount,
        totalAmount: newTotal,
        paidAmount: newPaidAmount,
        balanceImpact: newBalanceImpact,
        profit: newProfit,
        paymentType: newPaymentType,
        paymentMethod: data.paymentMethod ?? sale.paymentMethod,
        notes: data.notes !== undefined ? data.notes : sale.notes,
      });
      
      // Return updated sale with items
      const newSaleItems = await storage.getSaleItems(sale.id);
      res.json({ ...updatedSale, items: newSaleItems });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to update sale:", error);
      res.status(500).json({ error: "Failed to update sale" });
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
      
      // Check for active cash register session
      const activeSession = await storage.getActiveCashRegisterSession();
      if (!activeSession) {
        return res.status(400).json({ error: "No open cash register session. Please open a session first." });
      }
      
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

  app.delete("/api/purchase-invoices/:id", requirePermission("purchases:delete"), async (req, res) => {
    try {
      const invoice = await storage.getPurchaseInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });

      const invoiceItems = await storage.getPurchaseInvoiceItems(invoice.id);

      for (const invoiceItem of invoiceItems) {
        if (invoiceItem.itemId) {
          const item = await storage.getItem(invoiceItem.itemId);
          if (item && item.status === "sold") {
            return res.status(400).json({ 
              error: `Cannot delete: Item ${item.imei} has been sold` 
            });
          }
        }
      }

      if (invoice.balanceImpact > 0) {
        const supplier = await storage.getSupplier(invoice.supplierId);
        if (supplier && (supplier.balance || 0) < invoice.balanceImpact) {
          return res.status(400).json({ 
            error: "Cannot delete: Payments have been made against this purchase. The remaining balance is less than the original amount owed." 
          });
        }
      }

      for (const invoiceItem of invoiceItems) {
        if (invoiceItem.itemId) {
          const item = await storage.getItem(invoiceItem.itemId);
          if (item && !item.archived) {
            await storage.deleteItem(invoiceItem.itemId);
          }
        }
      }

      if (invoice.balanceImpact > 0) {
        const supplier = await storage.getSupplier(invoice.supplierId);
        if (supplier) {
          await storage.updateSupplier(invoice.supplierId, {
            balance: Math.max(0, (supplier.balance || 0) - invoice.balanceImpact),
          });
        }
      }

      await storage.deletePurchaseInvoiceItems(invoice.id);
      await storage.deletePurchaseInvoice(invoice.id);

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete purchase invoice" });
    }
  });

  app.post("/api/purchase-invoices/:id/restore", requirePermission("purchases:write"), async (req, res) => {
    try {
      await storage.restorePurchaseInvoice(req.params.id);
      res.status(200).json({ message: "Purchase invoice restored" });
    } catch (error) {
      res.status(500).json({ error: "Failed to restore purchase invoice" });
    }
  });

  app.delete("/api/purchase-invoices/:id/hard-delete", requirePermission("purchases:delete"), async (req, res) => {
    try {
      await storage.hardDeletePurchaseInvoice(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to permanently delete purchase invoice" });
    }
  });

  // Update purchase invoice (notes and discount only)
  const updatePurchaseInvoiceSchema = z.object({
    discountAmount: z.number().optional(),
    notes: z.string().nullable().optional(),
  });

  app.patch("/api/purchase-invoices/:id", requirePermission("purchases:write"), async (req, res) => {
    try {
      const invoice = await storage.getPurchaseInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ error: "Purchase invoice not found" });

      const data = updatePurchaseInvoiceSchema.parse(req.body);
      
      // Recalculate totals if discount changed
      let updateData: Record<string, unknown> = { ...data };
      if (data.discountAmount !== undefined && data.discountAmount !== invoice.discountAmount) {
        // Validate discount doesn't exceed subtotal
        if (data.discountAmount > invoice.subtotal) {
          return res.status(400).json({ error: "Discount cannot exceed subtotal" });
        }
        
        const newTotal = invoice.subtotal - data.discountAmount;
        const paidAmount = invoice.paidAmount || 0;
        const newBalanceImpact = Math.max(0, newTotal - paidAmount);
        
        // Recalculate payment type
        let newPaymentType = "credit";
        if (paidAmount >= newTotal) {
          newPaymentType = "full";
        } else if (paidAmount > 0) {
          newPaymentType = "partial";
        }
        
        // If balance changed and supplier exists, update supplier balance
        if (newBalanceImpact !== invoice.balanceImpact) {
          const supplier = await storage.getSupplier(invoice.supplierId);
          if (supplier) {
            const balanceDiff = newBalanceImpact - invoice.balanceImpact;
            await storage.updateSupplier(invoice.supplierId, {
              balance: Math.max(0, (supplier.balance || 0) + balanceDiff),
            });
          }
        }
        
        updateData.totalAmount = newTotal;
        updateData.balanceImpact = newBalanceImpact;
        updateData.paymentType = newPaymentType;
      }

      const updated = await storage.updatePurchaseInvoice(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update purchase invoice" });
    }
  });

  // Comprehensive purchase invoice edit (supplier, items, prices, paid amount)
  app.put("/api/purchase-invoices/:id", requirePermission("purchases:write"), async (req, res) => {
    try {
      const invoice = await storage.getPurchaseInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ error: "Purchase invoice not found" });

      const data = updatePurchaseInvoiceFullSchema.parse(req.body);
      
      // Get current invoice items
      const currentInvoiceItems = await storage.getPurchaseInvoiceItems(invoice.id);
      const currentItemIds = new Set(currentInvoiceItems.map(ii => ii.itemId).filter(Boolean));
      const newItemIds = new Set(data.items.filter(i => i.itemId).map(i => i.itemId));
      
      // Items to remove (existing items not in new list)
      const itemsToRemove = currentInvoiceItems.filter(ii => ii.itemId && !newItemIds.has(ii.itemId));
      
      // Check if any items to be removed have been sold
      for (const invoiceItem of itemsToRemove) {
        if (invoiceItem.itemId) {
          const item = await storage.getItem(invoiceItem.itemId);
          if (item && item.status === "sold") {
            return res.status(400).json({
              error: `Cannot remove item with IMEI ${item.imei}: it has already been sold`
            });
          }
        }
      }
      
      // Check for duplicate IMEIs in the new items
      const imeis = data.items.map(i => i.imei);
      const uniqueImeis = new Set(imeis);
      if (imeis.length !== uniqueImeis.size) {
        return res.status(400).json({ error: "Duplicate IMEIs are not allowed" });
      }
      
      // Check IMEI uniqueness for new items (items without itemId)
      const newItems = data.items.filter(i => !i.itemId);
      for (const newItem of newItems) {
        const existingItem = await storage.getItemByImei(newItem.imei);
        if (existingItem) {
          return res.status(400).json({
            error: `IMEI ${newItem.imei} already exists in inventory`
          });
        }
      }
      
      // Calculate new totals
      const discountAmount = data.discountAmount ?? invoice.discountAmount ?? 0;
      const newSubtotal = data.items.reduce((sum, i) => sum + i.unitPrice, 0);
      
      if (discountAmount > newSubtotal) {
        return res.status(400).json({ error: "Discount cannot exceed subtotal" });
      }
      
      const newTotal = newSubtotal - discountAmount;
      const newPaidAmount = data.paidAmount ?? invoice.paidAmount ?? 0;
      
      if (newPaidAmount > newTotal) {
        return res.status(400).json({ error: "Paid amount cannot exceed total" });
      }
      
      const newBalanceImpact = Math.max(0, newTotal - newPaidAmount);
      
      // Determine payment type
      let newPaymentType = "credit";
      if (newPaidAmount >= newTotal) {
        newPaymentType = "full";
      } else if (newPaidAmount > 0) {
        newPaymentType = "partial";
      }
      
      // ---- Begin updates ----
      
      // 1. Delete removed items from inventory
      for (const invoiceItem of itemsToRemove) {
        if (invoiceItem.itemId) {
          const item = await storage.getItem(invoiceItem.itemId);
          if (item && !item.archived && item.status !== "sold") {
            await storage.deleteItem(invoiceItem.itemId);
          }
        }
      }
      
      // 2. Update existing items' costs
      const existingItems = data.items.filter(i => i.itemId);
      for (const itemData of existingItems) {
        if (itemData.itemId) {
          const item = await storage.getItem(itemData.itemId);
          if (item) {
            await storage.updateItem(itemData.itemId, {
              purchasePrice: itemData.unitPrice,
              imei: itemData.imei,
              productId: itemData.productId,
            });
          }
        }
      }
      
      // 3. Create new inventory items
      const createdItems: { tempId: number; itemId: string }[] = [];
      for (let i = 0; i < newItems.length; i++) {
        const itemData = newItems[i];
        const newItem = await storage.createItem({
          productId: itemData.productId,
          imei: itemData.imei,
          purchasePrice: itemData.unitPrice,
          status: "available",
          purchaseInvoiceId: invoice.id,
          supplierId: data.supplierId,
        });
        createdItems.push({ tempId: i, itemId: newItem.id });
      }
      
      // 4. Delete old invoice items and create new ones
      await storage.deletePurchaseInvoiceItems(invoice.id);
      
      for (const itemData of data.items) {
        let itemId = itemData.itemId;
        if (!itemId) {
          // Find the created item by matching imei
          const createdItem = await storage.getItemByImei(itemData.imei);
          itemId = createdItem?.id;
        }
        
        if (itemId) {
          await storage.createPurchaseInvoiceItem({
            invoiceId: invoice.id,
            productId: itemData.productId,
            itemId: itemId,
            imei: itemData.imei,
            unitPrice: itemData.unitPrice,
            totalPrice: itemData.unitPrice,
          });
        }
      }
      
      // 5. Update supplier balances
      const oldSupplierId = invoice.supplierId;
      const newSupplierId = data.supplierId;
      
      // Remove balance from old supplier
      if (invoice.balanceImpact > 0) {
        const oldSupplier = await storage.getSupplier(oldSupplierId);
        if (oldSupplier) {
          await storage.updateSupplier(oldSupplierId, {
            balance: Math.max(0, (oldSupplier.balance || 0) - invoice.balanceImpact),
          });
        }
      }
      
      // Add balance to new supplier
      if (newBalanceImpact > 0) {
        const newSupplier = await storage.getSupplier(newSupplierId);
        if (newSupplier) {
          await storage.updateSupplier(newSupplierId, {
            balance: (newSupplier.balance || 0) + newBalanceImpact,
          });
        }
      }
      
      // 6. Update items with new supplier if changed
      if (oldSupplierId !== newSupplierId) {
        for (const itemData of data.items) {
          const itemId = itemData.itemId || (await storage.getItemByImei(itemData.imei))?.id;
          if (itemId) {
            await storage.updateItem(itemId, { supplierId: newSupplierId });
          }
        }
      }
      
      // 7. Update invoice record
      const updatedInvoice = await storage.updatePurchaseInvoice(invoice.id, {
        supplierId: newSupplierId,
        date: data.date ? new Date(data.date) : invoice.date,
        subtotal: newSubtotal,
        discountAmount: discountAmount,
        totalAmount: newTotal,
        paidAmount: newPaidAmount,
        balanceImpact: newBalanceImpact,
        paymentType: newPaymentType,
        notes: data.notes !== undefined ? data.notes : invoice.notes,
      });
      
      // Return updated invoice with items
      const newInvoiceItems = await storage.getPurchaseInvoiceItems(invoice.id);
      res.json({ ...updatedInvoice, items: newInvoiceItems });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Failed to update purchase invoice:", error);
      res.status(500).json({ error: "Failed to update purchase invoice" });
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
      
      // Determine balance impact based on transaction type
      // Payment: reduces balance (entity owes less)
      // Refund: increases balance (entity owes more / we owe less)
      const isRefund = data.transactionType === "refund";
      const balanceChange = isRefund ? data.amount : -data.amount;
      
      const payment = await storage.createPayment({
        ...data,
        cashRegisterSessionId: activeSession?.id || null,
      });

      // Update entity balance
      if (data.type === "customer") {
        const customer = await storage.getCustomer(data.entityId);
        if (customer) {
          await storage.updateCustomer(data.entityId, {
            balance: (customer.balance || 0) + balanceChange,
          });
        }
      } else if (data.type === "supplier") {
        const supplier = await storage.getSupplier(data.entityId);
        if (supplier) {
          await storage.updateSupplier(data.entityId, {
            balance: (supplier.balance || 0) + balanceChange,
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

  // Update payment (date editing)
  app.patch("/api/payments/:id", requirePermission("payments:write"), async (req, res) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) return res.status(404).json({ error: "Payment not found" });

      const data = updatePaymentSchema.parse(req.body);
      
      const updateData: any = {};
      if (data.date) {
        updateData.date = new Date(data.date);
      }
      if (data.amount !== undefined) {
        // Handle amount change - need to adjust entity balance
        const amountDiff = data.amount - payment.amount;
        if (amountDiff !== 0) {
          const isRefund = payment.transactionType === "refund";
          const balanceChange = isRefund ? amountDiff : -amountDiff;
          
          if (payment.type === "customer") {
            const customer = await storage.getCustomer(payment.entityId);
            if (customer) {
              await storage.updateCustomer(payment.entityId, {
                balance: (customer.balance || 0) + balanceChange,
              });
            }
          } else if (payment.type === "supplier") {
            const supplier = await storage.getSupplier(payment.entityId);
            if (supplier) {
              await storage.updateSupplier(payment.entityId, {
                balance: (supplier.balance || 0) + balanceChange,
              });
            }
          }
          updateData.amount = data.amount;
        }
      }
      if (data.paymentMethod !== undefined) {
        updateData.paymentMethod = data.paymentMethod;
      }
      if (data.reference !== undefined) {
        updateData.reference = data.reference;
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes;
      }

      const updated = await storage.updatePayment(payment.id, updateData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update payment" });
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
      if (!session) {
        return res.json(null);
      }
      
      // Calculate expected balance in real-time
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
        .reduce((sum, p) => {
          const isRefund = p.transactionType === "refund";
          const isCustomer = p.type === "customer";
          if (isCustomer) {
            return sum + (isRefund ? -p.amount : p.amount);
          } else {
            return sum + (isRefund ? p.amount : -p.amount);
          }
        }, 0);
      
      const expensesCash = sessionExpenses
        .filter(e => e.paymentMethod === "cash")
        .reduce((sum, e) => sum + e.amount, 0);

      const expectedBalance = session.openingBalance + salesCash + paymentsCash - expensesCash;
      
      // Get only the entity names needed for this session's payments
      const customerIds = new Set(sessionPayments.filter(p => p.type === 'customer').map(p => p.entityId));
      const supplierIds = new Set(sessionPayments.filter(p => p.type === 'supplier').map(p => p.entityId));
      
      const customerMap = new Map<string, string>();
      const supplierMap = new Map<string, string>();
      
      // Only fetch entities that are actually referenced
      if (customerIds.size > 0) {
        const customers = await storage.getCustomers();
        for (const c of customers) {
          if (customerIds.has(c.id)) {
            customerMap.set(c.id, c.name);
          }
        }
      }
      if (supplierIds.size > 0) {
        const suppliers = await storage.getSuppliers();
        for (const s of suppliers) {
          if (supplierIds.has(s.id)) {
            supplierMap.set(s.id, s.name);
          }
        }
      }

      // Format transactions for display
      const transactions: Array<{
        id: string;
        type: 'sale' | 'payment' | 'expense';
        description: string;
        amount: number;
        cashAmount: number;
        paymentMethod: string;
        date: string;
      }> = [];

      for (const sale of sessionSales) {
        transactions.push({
          id: sale.id,
          type: 'sale',
          description: `Sale ${sale.saleNumber}`,
          amount: sale.paidAmount ?? 0,
          cashAmount: sale.paymentMethod === 'cash' ? (sale.paidAmount ?? 0) : 0,
          paymentMethod: sale.paymentMethod ?? 'cash',
          date: String(sale.date),
        });
      }

      for (const payment of sessionPayments) {
        const entityName = payment.type === 'customer' 
          ? customerMap.get(payment.entityId) || 'Unknown'
          : supplierMap.get(payment.entityId) || 'Unknown';
        const isRefund = payment.transactionType === 'refund';
        const typeLabel = isRefund ? 'Refund' : 'Payment';
        const direction = payment.type === 'customer' 
          ? (isRefund ? 'to' : 'from')
          : (isRefund ? 'from' : 'to');
        
        // Calculate cash impact
        let cashAmount = 0;
        if (payment.paymentMethod === 'cash') {
          if (payment.type === 'customer') {
            cashAmount = isRefund ? -payment.amount : payment.amount;
          } else {
            cashAmount = isRefund ? payment.amount : -payment.amount;
          }
        }
        
        transactions.push({
          id: payment.id,
          type: 'payment',
          description: `${typeLabel} ${direction} ${entityName}`,
          amount: payment.amount,
          cashAmount,
          paymentMethod: payment.paymentMethod,
          date: String(payment.date),
        });
      }

      for (const expense of sessionExpenses) {
        transactions.push({
          id: expense.id,
          type: 'expense',
          description: `Expense: ${expense.category}`,
          amount: expense.amount,
          cashAmount: expense.paymentMethod === 'cash' ? -expense.amount : 0,
          paymentMethod: expense.paymentMethod,
          date: String(expense.date),
        });
      }

      // Sort by date
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      res.json({
        ...session,
        expectedBalance,
        transactionCount: sessionSales.length + sessionPayments.length + sessionExpenses.length,
        transactions,
        summary: {
          salesCount: sessionSales.length,
          paymentsCount: sessionPayments.length,
          expensesCount: sessionExpenses.length,
          salesCash,
          paymentsCash,
          expensesCash,
        },
      });
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
      
      // Calculate payment cash flow correctly based on type and transaction type
      // Customer payment = money IN (+), Customer refund = money OUT (-)
      // Supplier payment = money OUT (-), Supplier refund = money IN (+)
      const paymentsCash = sessionPayments
        .filter(p => p.paymentMethod === "cash")
        .reduce((sum, p) => {
          const isRefund = p.transactionType === "refund";
          const isCustomer = p.type === "customer";
          // Customer payment = +, Customer refund = -
          // Supplier payment = -, Supplier refund = +
          if (isCustomer) {
            return sum + (isRefund ? -p.amount : p.amount);
          } else {
            return sum + (isRefund ? p.amount : -p.amount);
          }
        }, 0);
      
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

  // Update cash register session open date
  app.patch("/api/cash-register/:id/date", requirePermission("cash_register:write"), async (req, res) => {
    try {
      const session = await storage.getCashRegisterSession(req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const data = updateCashRegisterSessionDateSchema.parse(req.body);
      
      const updatedSession = await storage.updateCashRegisterSession(session.id, {
        openedAt: new Date(data.openedAt),
      });

      res.json(updatedSession);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update session date" });
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

  // ============ ARCHIVED DATA ============
  app.get("/api/archived", async (req, res) => {
    try {
      const [customers, suppliers, sales, purchases] = await Promise.all([
        storage.getArchivedCustomers(),
        storage.getArchivedSuppliers(),
        storage.getArchivedSales(),
        storage.getArchivedPurchaseInvoices(),
      ]);
      res.json({ customers, suppliers, sales, purchases });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch archived data" });
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
      const customers = await storage.getCustomers();
      const suppliers = await storage.getSuppliers();

      // Create lookup maps
      const customerMap = new Map(customers.map(c => [c.id, c.name]));
      const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));

      // Get recent activity (last 10 items combined)
      const activities = [
        ...sales.map(s => ({ 
          type: "sale" as const, 
          id: s.id,
          description: `Sale ${s.saleNumber}${s.customerId ? ` to ${customerMap.get(s.customerId) || 'Customer'}` : ''}`,
          amount: s.totalAmount,
          date: s.date,
          status: s.paymentType === "full" ? "paid" : "partial",
        })),
        ...payments.map(p => {
          const isRefund = p.transactionType === "refund";
          const entityName = p.type === "customer" 
            ? customerMap.get(p.entityId) || "Customer"
            : supplierMap.get(p.entityId) || "Supplier";
          const actionWord = isRefund ? "Refund" : "Payment";
          const directionWord = p.type === "customer"
            ? (isRefund ? "to" : "from")
            : (isRefund ? "from" : "to");
          return {
            type: "payment" as const,
            id: p.id,
            description: `${actionWord} ${directionWord} ${entityName}`,
            amount: p.amount,
            date: p.date,
            status: "completed",
            transactionType: p.transactionType || "payment",
            paymentEntityType: p.type,
          };
        }),
        ...purchases.map(p => ({ 
          type: "purchase" as const, 
          id: p.id,
          description: `Purchase ${p.invoiceNumber}${p.supplierId ? ` from ${supplierMap.get(p.supplierId) || 'Supplier'}` : ''}`,
          amount: p.totalAmount,
          date: p.date,
          status: p.paymentType === "full" ? "paid" : "partial",
        })),
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

  // Sales by category chart data
  app.get("/api/dashboard/sales-by-category", async (req, res) => {
    try {
      const sales = await storage.getSales();
      const saleItems = await Promise.all(sales.map(s => storage.getSaleItems(s.id)));
      const products = await storage.getProducts();

      const productMap = new Map(products.map(p => [p.id, p]));
      const categoryTotals: Record<string, number> = {};

      saleItems.flat().forEach(item => {
        const product = productMap.get(item.productId);
        const category = product?.category || "Other";
        categoryTotals[category] = (categoryTotals[category] || 0) + item.totalPrice;
      });

      const totalValue = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
      
      const chartData = Object.entries(categoryTotals)
        .map(([name, value]) => ({
          name,
          value: Math.round((value / (totalValue || 1)) * 100),
        }))
        .sort((a, b) => b.value - a.value);

      res.json(chartData.length > 0 ? chartData : [{ name: "No sales", value: 100 }]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales by category" });
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
      const customerPayments = filteredPayments.filter(p => p.type === "customer").reduce((sum, p) => sum + p.amount, 0);
      const supplierPayments = filteredPayments.filter(p => p.type === "supplier").reduce((sum, p) => sum + p.amount, 0);
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
        if (payment.type === "customer") {
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
