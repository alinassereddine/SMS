import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, FileText, MoreHorizontal, Eye, Printer, Trash2, Package, AlertTriangle, Pencil, X, Search, Upload, Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import { DataTable, Column } from "@/components/data-table";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/currency-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate, generateInvoiceNumber, sortByName } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { PurchaseInvoiceWithSupplier, Supplier, Product } from "@shared/schema";

type DatePreset = "today" | "week" | "month" | "year" | "all";

const datePresets: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

function getDateRange(preset: DatePreset): { from: Date | null; to: Date } {
  const now = new Date();
  const to = now;
  
  switch (preset) {
    case "today":
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return { from: today, to };
    case "week":
      const week = new Date(now);
      week.setDate(now.getDate() - 7);
      return { from: week, to };
    case "month":
      const month = new Date(now);
      month.setMonth(now.getMonth() - 1);
      return { from: month, to };
    case "year":
      const year = new Date(now);
      year.setFullYear(now.getFullYear() - 1);
      return { from: year, to };
    case "all":
    default:
      return { from: null, to };
  }
}

const purchaseFormSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  paidAmount: z.number().min(0),
  notes: z.string().optional(),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface ItemEntry {
  productId: string;
  imei: string;
  unitPrice: number;
}

type EditItem = {
  itemId?: string;
  productId: string;
  imei: string;
  unitPrice: number;
  productName: string;
};

export default function Purchases() {
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoiceWithSupplier | null>(null);
  const [deleteConfirmInvoice, setDeleteConfirmInvoice] = useState<PurchaseInvoiceWithSupplier | null>(null);
  const [editInvoice, setEditInvoice] = useState<PurchaseInvoiceWithSupplier | null>(null);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [editSupplierId, setEditSupplierId] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");
  const [editDiscount, setEditDiscount] = useState(0);
  const { can } = useAuth();
  const canSeeBalance = can("purchases:balance");
  const canDelete = can("purchases:delete");
  const canImport = can("purchases:write");
  const { from: dateFrom } = getDateRange(datePreset);
  const [editPaidAmount, setEditPaidAmount] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemProductId, setNewItemProductId] = useState("");
  const [newItemImei, setNewItemImei] = useState("");
  const [newItemCost, setNewItemCost] = useState(0);
  const [itemEntries, setItemEntries] = useState<ItemEntry[]>([{ productId: "", imei: "", unitPrice: 0 }]);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const header = [
      "InvoiceNumber",
      "Supplier",
      "Date",
      "Product",
      "IMEI",
      "UnitPrice",
      "DiscountAmount",
      "PaidAmount",
      "Notes",
    ];
    const example = [
      "PI000001",
      "Apple Distributor",
      "2025-01-01",
      "iPhone 15 Pro",
      "111111111111111",
      "450000",
      "0",
      "0",
      "",
    ];
    const csv = [header, example]
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "");
            const escaped = value.replace(/\"/g, '""');
            return `"${escaped}"`;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "purchase-invoices-import-template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/purchase-invoices/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Import failed",
          description: body?.error || "Failed to import purchase invoices",
          variant: "destructive",
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });

      const imported = body?.imported ?? 0;
      const totalRows = body?.totalRows ?? 0;
      const errorsCount = Array.isArray(body?.errors) ? body.errors.length : 0;

      toast({
        title: "Import completed",
        description: `Imported ${imported} invoices from ${totalRows} rows${errorsCount ? ` (${errorsCount} errors)` : ""}.`,
      });
    } catch {
      toast({
        title: "Import failed",
        description: "Failed to import purchase invoices",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const { data: invoices = [], isLoading } = useQuery<PurchaseInvoiceWithSupplier[]>({
    queryKey: ["/api/purchase-invoices"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const sortedSuppliers = useMemo(() => sortByName(suppliers), [suppliers]);
  const sortedProducts = useMemo(() => sortByName(products), [products]);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplierId: "",
      paidAmount: 0,
      notes: "",
    },
  });

  const resetNewPurchaseForm = () => {
    form.reset();
    setItemEntries([{ productId: "", imei: "", unitPrice: 0 }]);
  };

  const handleNewPurchaseDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetNewPurchaseForm();
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: PurchaseFormValues) => {
      const validItems = itemEntries.filter(i => i.productId && i.imei && i.unitPrice > 0);
      if (validItems.length === 0) {
        throw new Error("At least one item is required");
      }

      const subtotal = validItems.reduce((sum, i) => sum + i.unitPrice, 0);
      const paymentType = data.paidAmount >= subtotal ? "full" : data.paidAmount > 0 ? "partial" : "credit";

      return apiRequest("POST", "/api/purchase-invoices", {
        invoiceNumber: generateInvoiceNumber("PUR"),
        supplierId: data.supplierId,
        subtotal,
        discountAmount: 0,
        totalAmount: subtotal,
        paidAmount: data.paidAmount,
        balanceImpact: subtotal - data.paidAmount,
        paymentType,
        notes: data.notes,
        items: validItems.map(item => ({
          ...item,
          quantity: 1,
          totalPrice: item.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setIsDialogOpen(false);
      form.reset();
      setItemEntries([{ productId: "", imei: "", unitPrice: 0 }]);
      toast({ title: "Purchase invoice created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to create invoice", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/purchase-invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setDeleteConfirmInvoice(null);
      toast({ title: "Purchase invoice deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to delete invoice", variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PUT", `/api/purchase-invoices/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setEditInvoice(null);
      toast({ title: "Purchase invoice updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to update invoice", variant: "destructive" });
    },
  });

  const handleOpenEdit = (invoice: PurchaseInvoiceWithSupplier) => {
    setEditInvoice(invoice);
    setEditItems(
      invoice.items?.map((item) => ({
        itemId: item.itemId,
        productId: item.productId,
        imei: item.imei || "",
        unitPrice: item.unitPrice || 0,
        productName: item.product?.name || "Unknown",
      })) || []
    );
    setEditSupplierId(invoice.supplierId);
    setEditDate(new Date(invoice.date).toISOString().split("T")[0]);
    setEditDiscount(invoice.discountAmount || 0);
    setEditPaidAmount(invoice.paidAmount || 0);
    setEditNotes(invoice.notes || "");
    setShowAddItem(false);
    setNewItemProductId("");
    setNewItemImei("");
    setNewItemCost(0);
  };

  const handleRemoveEditItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateEditItemCost = (index: number, newCost: number) => {
    setEditItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, unitPrice: newCost } : item))
    );
  };

  const handleAddNewItem = () => {
    if (!newItemProductId || !newItemImei || newItemCost <= 0) {
      toast({ title: "Please fill all item fields", variant: "destructive" });
      return;
    }
    const product = products.find((p) => p.id === newItemProductId);
    setEditItems((prev) => [
      ...prev,
      {
        productId: newItemProductId,
        imei: newItemImei,
        unitPrice: newItemCost,
        productName: product?.name || "Unknown",
      },
    ]);
    setShowAddItem(false);
    setNewItemProductId("");
    setNewItemImei("");
    setNewItemCost(0);
  };

  const handleSaveEdit = () => {
    if (!editInvoice || editItems.length === 0) {
      toast({ title: "Purchase must have at least one item", variant: "destructive" });
      return;
    }
    editMutation.mutate({
      id: editInvoice.id,
      data: {
        supplierId: editSupplierId,
        date: editDate,
        discountAmount: editDiscount,
        paidAmount: editPaidAmount,
        notes: editNotes || null,
        items: editItems.map((item) => ({
          itemId: item.itemId,
          productId: item.productId,
          imei: item.imei,
          unitPrice: item.unitPrice,
        })),
      },
    });
  };

  const editSubtotal = editItems.reduce((sum, i) => sum + i.unitPrice, 0);
  const editTotal = Math.max(0, editSubtotal - editDiscount);
  const editBalance = Math.max(0, editTotal - editPaidAmount);

  const handleSubmit = (data: PurchaseFormValues) => {
    createMutation.mutate(data);
  };

  const addItemEntry = () => {
    setItemEntries([...itemEntries, { productId: "", imei: "", unitPrice: 0 }]);
  };

  const removeItemEntry = (index: number) => {
    if (itemEntries.length > 1) {
      setItemEntries(itemEntries.filter((_, i) => i !== index));
    }
  };

  const updateItemEntry = (index: number, field: keyof ItemEntry, value: string | number) => {
    setItemEntries(itemEntries.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const subtotal = itemEntries.reduce((sum, i) => sum + (i.unitPrice || 0), 0);

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      invoice.supplier?.name.toLowerCase().includes(search.toLowerCase());
    const invoiceDate = new Date(invoice.date);
    const matchesDate = !dateFrom || invoiceDate >= dateFrom;
    return matchesSearch && matchesDate;
  });

  const columns: Column<PurchaseInvoiceWithSupplier>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      render: (invoice) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-mono text-sm font-medium">{invoice.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground">{formatDate(invoice.date)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (invoice) => (
        <span className="text-sm">{invoice.supplier?.name || "-"}</span>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (invoice) => (
        <Badge variant="secondary" className="text-xs">
          {invoice.items?.length || 0} item{(invoice.items?.length || 0) !== 1 ? "s" : ""}
        </Badge>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (invoice) => (
        <span className="font-mono text-sm font-medium">
          {formatCurrency(invoice.totalAmount)}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      render: (invoice) => <StatusBadge status={invoice.paymentType} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (invoice) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-actions-${invoice.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedInvoice(invoice)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenEdit(invoice)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem 
                onClick={() => setDeleteConfirmInvoice(invoice)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const totalPurchases = filteredInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalOwed = filteredInvoices.reduce((sum, i) => sum + i.balanceImpact, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Invoices" description="Manage supplier purchases">
        <div className="flex items-center gap-2">
          {canImport && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                }}
              />
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
              <Button
                variant="outline"
                onClick={() => importInputRef.current?.click()}
                disabled={isImporting}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? "Importing..." : "Import"}
              </Button>
            </>
          )}
          <ExportButton
            data={filteredInvoices}
            filename="purchases"
            columns={[
              { key: "invoiceNumber", header: "Invoice #" },
              { key: "supplier", header: "Supplier", format: (_, row) => row.supplier?.name || "" },
              { key: "date", header: "Date", format: (v) => v ? new Date(v).toLocaleDateString() : "" },
              { key: "totalAmount", header: "Total", format: (v) => (v / 100).toFixed(2) },
              { key: "paidAmount", header: "Paid", format: (v) => (v / 100).toFixed(2) },
              { key: "balanceImpact", header: "Balance", format: (v) => (v / 100).toFixed(2) },
              { key: "paymentType", header: "Payment Type" },
              { key: "notes", header: "Notes" },
            ]}
          />
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-purchase">
            <Plus className="h-4 w-4 mr-2" />
            New Purchase
          </Button>
        </div>
      </PageHeader>

      <div className={`grid gap-4 ${canSeeBalance ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredInvoices.length}</div>
            <p className="text-xs text-muted-foreground">Total Invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(totalPurchases)}</div>
            <p className="text-xs text-muted-foreground">Total Purchases</p>
          </CardContent>
        </Card>
        {canSeeBalance && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalOwed)}
              </div>
              <p className="text-xs text-muted-foreground">Outstanding Balance</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search invoices..."
          className="max-w-sm"
        />
        <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
          <SelectTrigger className="w-40" data-testid="select-date-filter">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            {datePresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredInvoices}
        isLoading={isLoading}
        emptyMessage="No purchase invoices found"
        emptyDescription="Create your first purchase invoice."
        getRowKey={(i) => i.id}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleNewPurchaseDialogChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Invoice</DialogTitle>
            <DialogDescription>
              Add items received from a supplier
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-purchase-supplier">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sortedSuppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Items</span>
                </div>
                <div className="space-y-3">
                  {itemEntries.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 rounded-lg bg-muted/50">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Select
                          value={item.productId}
                          onValueChange={(v) => updateItemEntry(index, "productId", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Product" />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedProducts.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="IMEI"
                          value={item.imei}
                          onChange={(e) => updateItemEntry(index, "imei", e.target.value)}
                          className="font-mono"
                        />
                        <CurrencyInput
                          value={item.unitPrice}
                          onChange={(v) => updateItemEntry(index, "unitPrice", v)}
                        />
                      </div>
                      {itemEntries.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItemEntry(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <Button type="button" variant="outline" size="sm" onClick={addItemEntry}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Item
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Subtotal</span>
                <span className="font-mono font-bold text-lg">{formatCurrency(subtotal)}</span>
              </div>

              <FormField
                control={form.control}
                name="paidAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Paid</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleNewPurchaseDialogChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-purchase">
                  {createMutation.isPending ? "Creating..." : "Create Invoice"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Invoice Number</p>
                  <p className="font-mono font-medium">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Supplier</p>
                  <p className="font-medium">{selectedInvoice.supplier?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Payment Status</p>
                  <StatusBadge status={selectedInvoice.paymentType} />
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-3">Items</p>
                <div className="space-y-2">
                  {selectedInvoice.items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.product?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.imei}</p>
                        </div>
                      </div>
                      <span className="font-mono font-medium">{formatCurrency(item.unitPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-mono font-bold">{formatCurrency(selectedInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.paidAmount || 0)}</span>
                </div>
                {selectedInvoice.balanceImpact > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Balance Due</span>
                    <span className="font-mono font-bold">{formatCurrency(selectedInvoice.balanceImpact)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteConfirmInvoice}
        onOpenChange={(open) => !open && setDeleteConfirmInvoice(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Purchase Invoice
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete invoice{" "}
              <span className="font-mono font-medium">{deleteConfirmInvoice?.invoiceNumber}</span>{" "}
              and remove all associated inventory items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (deleteConfirmInvoice) deleteMutation.mutate(deleteConfirmInvoice.id);
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editInvoice} onOpenChange={() => setEditInvoice(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Purchase Invoice</DialogTitle>
            <DialogDescription>
              Edit invoice <span className="font-mono font-medium">{editInvoice?.invoiceNumber}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Supplier</span>
                <Select value={editSupplierId} onValueChange={setEditSupplierId}>
                  <SelectTrigger data-testid="select-edit-supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedSuppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Date</span>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  data-testid="input-edit-date"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Items ({editItems.length})</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddItem(!showAddItem)}
                  data-testid="button-toggle-add-item"
                >
                  {showAddItem ? (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Item
                    </>
                  )}
                </Button>
              </div>

              {showAddItem && (
                <Card className="p-3">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Select value={newItemProductId} onValueChange={setNewItemProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Product" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedProducts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="IMEI"
                        value={newItemImei}
                        onChange={(e) => setNewItemImei(e.target.value)}
                        className="font-mono"
                      />
                      <CurrencyInput
                        value={newItemCost}
                        onChange={setNewItemCost}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddNewItem}
                      className="w-full"
                      data-testid="button-confirm-add-item"
                    >
                      Add to Purchase
                    </Button>
                  </div>
                </Card>
              )}

              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {editItems.map((item, index) => (
                    <div
                      key={item.itemId || `new-${index}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.productName}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            {item.imei}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CurrencyInput
                          value={item.unitPrice}
                          onChange={(v) => handleUpdateEditItemCost(index, v)}
                          className="w-28"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveEditItem(index)}
                          disabled={editItems.length === 1}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Subtotal</span>
                <span className="font-mono font-bold">{formatCurrency(editSubtotal)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Discount</span>
              <CurrencyInput value={editDiscount} onChange={setEditDiscount} />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total</span>
              <span className="font-mono font-bold text-lg">{formatCurrency(editTotal)}</span>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Amount Paid</span>
              <CurrencyInput value={editPaidAmount} onChange={setEditPaidAmount} />
            </div>

            {editBalance > 0 && (
              <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                <span className="text-sm font-medium">Balance Due</span>
                <span className="font-mono font-bold">{formatCurrency(editBalance)}</span>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-sm font-medium">Notes</span>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes..."
                data-testid="input-edit-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInvoice(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editMutation.isPending || editItems.length === 0}
              data-testid="button-save-edit"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
