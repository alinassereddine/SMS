import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Eye, Receipt, MoreHorizontal, Printer, Trash2, AlertTriangle, Pencil, Plus, X, Upload, Download } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { DataTable, Column } from "@/components/data-table";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { formatCurrency, formatDate, formatDateInput, formatDateTime, parseDateValue, sortByName } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { Sale, SaleWithCustomer, Item, Product, Customer } from "@shared/schema";
import { Link } from "wouter";

type DatePreset = "today" | "week" | "month" | "year" | "all";

const datePresets: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

function getDateRange(preset: DatePreset): { from: Date | null; to: Date | null } {
  const now = new Date();
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  const to = endOfDay(now);

  switch (preset) {
    case "today": {
      const today = startOfDay(now);
      return { from: today, to };
    }
    case "week": {
      const weekStart = startOfDay(new Date(now));
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { from: weekStart, to };
    }
    case "month": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: monthStart, to };
    }
    case "year": {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return { from: yearStart, to };
    }
    case "all":
    default:
      return { from: null, to: null };
  }
}

type EditItem = {
  itemId: string;
  imei: string;
  productName: string;
  purchasePrice: number;
  unitPrice: number;
};

export default function Sales() {
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [selectedSale, setSelectedSale] = useState<SaleWithCustomer | null>(null);
  const [deleteConfirmSale, setDeleteConfirmSale] = useState<SaleWithCustomer | null>(null);
  const { can } = useAuth();
  const canDelete = can("sales:delete");
  const canImport = can("sales:write");
  const { from: dateFrom, to: dateTo } = getDateRange(datePreset);
  const [editSale, setEditSale] = useState<SaleWithCustomer | null>(null);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editDiscount, setEditDiscount] = useState(0);
  const [editPaidAmount, setEditPaidAmount] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const { toast } = useToast();

  const downloadTemplate = () => {
    const header = [
      "SaleNumber",
      "Customer",
      "Date",
      "IMEI",
      "UnitPrice",
      "DiscountAmount",
      "PaidAmount",
      "PaymentMethod",
      "Notes",
    ];
    const example = [
      "S000001",
      "Walk-in Customer",
      "2025-01-05",
      "111111111111111",
      "550000",
      "0",
      "550000",
      "cash",
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
    a.download = "sales-import-template.csv";
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

      const res = await fetch("/api/sales/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Import failed",
          description: body?.error || "Failed to import sales",
          variant: "destructive",
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });

      const imported = body?.imported ?? 0;
      const totalRows = body?.totalRows ?? 0;
      const errorsCount = Array.isArray(body?.errors) ? body.errors.length : 0;

      toast({
        title: "Import completed",
        description: `Imported ${imported} sales from ${totalRows} rows${errorsCount ? ` (${errorsCount} errors)` : ""}.`,
      });
    } catch {
      toast({
        title: "Import failed",
        description: "Failed to import sales",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const { data: sales = [], isLoading } = useQuery<SaleWithCustomer[]>({
    queryKey: ["/api/sales"],
  });

  const { data: availableItems = [] } = useQuery<(Item & { product: Product })[]>({
    queryKey: ["/api/items", { status: "available" }],
    queryFn: async () => {
      const res = await fetch("/api/items?status=available");
      if (!res.ok) throw new Error("Failed to fetch available items");
      return res.json();
    },
    enabled: !!editSale,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: !!editSale,
  });

  const sortedCustomers = useMemo(() => sortByName(customers), [customers]);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: !!editSale,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDeleteConfirmSale(null);
      toast({ title: "Sale deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to delete sale", variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PUT", `/api/sales/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setEditSale(null);
      toast({ title: "Sale updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to update sale", variant: "destructive" });
    },
  });

  const handleOpenEdit = (sale: SaleWithCustomer) => {
    setEditSale(sale);
    setEditItems(
      sale.items?.map((item) => ({
        itemId: item.itemId,
        imei: item.imei,
        productName: item.product?.name || "Unknown",
        purchasePrice: item.purchasePrice,
        unitPrice: item.unitPrice,
      })) || []
    );
    setEditCustomerId(sale.customerId || null);
    setEditDate(formatDateInput(sale.date));
    setEditDiscount(sale.discountAmount || 0);
    setEditPaidAmount(sale.paidAmount || 0);
    setEditNotes(sale.notes || "");
    setShowAddItem(false);
    setItemSearch("");
  };

  const handleRemoveItem = (itemId: string) => {
    setEditItems((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const handleUpdateItemPrice = (itemId: string, newPrice: number) => {
    setEditItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, unitPrice: newPrice } : i))
    );
  };

  const handleAddItem = (item: Item & { product: Product }) => {
    const product = products.find((p) => p.id === item.productId);
    setEditItems((prev) => [
      ...prev,
      {
        itemId: item.id,
        imei: item.imei,
        productName: product?.name || item.product?.name || "Unknown",
        purchasePrice: item.purchasePrice,
        unitPrice: item.purchasePrice,
      },
    ]);
    setShowAddItem(false);
    setItemSearch("");
  };

  const handleSaveEdit = () => {
    if (!editSale || editItems.length === 0) {
      toast({ title: "Sale must have at least one item", variant: "destructive" });
      return;
    }
    editMutation.mutate({
      id: editSale.id,
      data: {
        customerId: editCustomerId,
        date: editDate,
        discountAmount: editDiscount,
        paidAmount: editPaidAmount,
        notes: editNotes || null,
        items: editItems.map((i) => ({ itemId: i.itemId, unitPrice: i.unitPrice })),
      },
    });
  };

  const editSubtotal = editItems.reduce((sum, i) => sum + i.unitPrice, 0);
  const editTotal = Math.max(0, editSubtotal - editDiscount);
  const editProfit = editItems.reduce((sum, i) => sum + Math.max(0, i.unitPrice - i.purchasePrice), 0);
  const editBalance = Math.max(0, editTotal - editPaidAmount);

  const filteredAvailableItems = availableItems.filter((item) => {
    const matchesSearch =
      item.imei.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.product?.name?.toLowerCase().includes(itemSearch.toLowerCase());
    const notAlreadyAdded = !editItems.some((ei) => ei.itemId === item.id);
    return matchesSearch && notAlreadyAdded;
  });

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.saleNumber.toLowerCase().includes(search.toLowerCase()) ||
      sale.customer?.name.toLowerCase().includes(search.toLowerCase());
    const matchesPayment = paymentFilter === "all" || sale.paymentType === paymentFilter;
    const saleDate = parseDateValue(sale.date);
    const matchesDate =
      (!dateFrom || (saleDate && saleDate >= dateFrom)) &&
      (!dateTo || (saleDate && saleDate <= dateTo));
    return matchesSearch && matchesPayment && matchesDate;
  });

  const columns: Column<SaleWithCustomer>[] = [
    {
      key: "saleNumber",
      header: "Sale #",
      render: (sale) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-mono text-sm font-medium">{sale.saleNumber}</p>
            <p className="text-xs text-muted-foreground">{formatDate(sale.date)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (sale) => (
        <span className="text-sm">{sale.customer?.name || "Walk-in"}</span>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (sale) => (
        <Badge variant="secondary" className="text-xs">
          {sale.items?.length || 0} item{(sale.items?.length || 0) !== 1 ? "s" : ""}
        </Badge>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (sale) => (
        <span className="font-mono text-sm font-medium">
          {formatCurrency(sale.totalAmount)}
        </span>
      ),
    },
    {
      key: "profit",
      header: "Profit",
      render: (sale) => (
        <span className="font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
          +{formatCurrency(sale.profit)}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      render: (sale) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={sale.paymentType} />
          <Badge variant="outline" className="text-xs capitalize">
            {sale.paymentMethod}
          </Badge>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (sale) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-actions-${sale.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedSale(sale)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenEdit(sale)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem
                onClick={() => setDeleteConfirmSale(sale)}
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

  const totalSales = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalProfit = filteredSales.reduce((sum, s) => sum + s.profit, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Sales" description={`${filteredSales.length} sales found`}>
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
          <Link href="/pos">
            <Button data-testid="button-new-sale">
              <Receipt className="h-4 w-4 mr-2" />
              New Sale
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredSales.length}</div>
            <p className="text-xs text-muted-foreground">Total Sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">Total Profit</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search sales..."
          className="max-w-sm"
        />
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-40" data-testid="select-payment-filter">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="full">Full</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
          </SelectContent>
        </Select>
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
        data={filteredSales}
        isLoading={isLoading}
        emptyMessage="No sales found"
        emptyDescription="Start a new sale from the POS."
        getRowKey={(s) => s.id}
        pageSize={10}
      />


      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Sale Number</p>
                  <p className="font-mono font-medium">{selectedSale.saleNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Date</p>
                  <p className="font-medium">{formatDateTime(selectedSale.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Customer</p>
                  <p className="font-medium">{selectedSale.customer?.name || "Walk-in"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Payment</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedSale.paymentType} />
                    <span className="text-sm capitalize">{selectedSale.paymentMethod}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-3">Items</p>
                <div className="space-y-2">
                  {selectedSale.items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{item.product?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.imei}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-medium">{formatCurrency(item.unitPrice)}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(item.profit)} profit
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                {(selectedSale.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-mono text-red-600">
                      -{formatCurrency(selectedSale.discountAmount || 0)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="font-mono">{formatCurrency(selectedSale.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-mono">{formatCurrency(selectedSale.paidAmount || 0)}</span>
                </div>
                {(selectedSale.balanceImpact || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance Due</span>
                    <span className="font-mono text-amber-600">{formatCurrency(selectedSale.balanceImpact)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="font-medium">Profit</span>
                  <span className="font-mono font-bold">+{formatCurrency(selectedSale.profit)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteConfirmSale}
        onOpenChange={(open) => !open && setDeleteConfirmSale(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Sale
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete sale{" "}
              <span className="font-mono font-medium">{deleteConfirmSale?.saleNumber}</span>{" "}
              and return all items back to available inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (deleteConfirmSale) deleteMutation.mutate(deleteConfirmSale.id);
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

      <Dialog open={!!editSale} onOpenChange={() => setEditSale(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
            <DialogDescription>
              Edit sale <span className="font-mono font-medium">{editSale?.saleNumber}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Customer</span>
                <Select
                  value={editCustomerId || "walk-in"}
                  onValueChange={(v) => setEditCustomerId(v === "walk-in" ? null : v)}
                >
                  <SelectTrigger data-testid="select-edit-customer">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                    {sortedCustomers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editBalance > 0 && !editCustomerId && (
                  <p className="text-xs text-destructive">Customer required for credit/partial sales</p>
                )}
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

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Items ({editItems.length})</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddItem(true)}
                  data-testid="button-add-item"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {editItems.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg">
                  No items. Add at least one item.
                </p>
              ) : (
                <div className="max-h-[260px] overflow-y-auto pr-2">
                  <div className="space-y-2">
                    {editItems.map((item) => (
                      <div key={item.itemId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.productName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.imei}</p>
                          <p className="text-xs text-muted-foreground">
                            Cost: {formatCurrency(item.purchasePrice)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-28">
                            <CurrencyInput
                              value={item.unitPrice}
                              onChange={(v) => handleUpdateItemPrice(item.itemId, v)}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.itemId)}
                            data-testid={`button-remove-item-${item.itemId}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {showAddItem && (
              <div className="space-y-2 p-3 border rounded-lg bg-card">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Add Available Item</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddItem(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Search by IMEI or product..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  data-testid="input-item-search"
                />
                <ScrollArea className="h-40">
                  {filteredAvailableItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2 text-center">
                      No available items found
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {filteredAvailableItems.slice(0, 20).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded hover-elevate cursor-pointer"
                          onClick={() => handleAddItem(item)}
                          data-testid={`item-option-${item.id}`}
                        >
                          <div>
                            <p className="text-sm font-medium">{item.product?.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{item.imei}</p>
                          </div>
                          <span className="text-sm font-mono">{formatCurrency(item.purchasePrice)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Discount</span>
                <CurrencyInput value={editDiscount} onChange={setEditDiscount} />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Paid Amount</span>
                <CurrencyInput value={editPaidAmount} onChange={setEditPaidAmount} />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Notes</span>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes..."
                data-testid="input-edit-notes"
              />
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatCurrency(editSubtotal)}</span>
              </div>
              {editDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-mono text-red-600">-{formatCurrency(editDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="font-mono">{formatCurrency(editTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-mono">{formatCurrency(editPaidAmount)}</span>
              </div>
              {editBalance > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance Due</span>
                  <span className="font-mono text-amber-600">{formatCurrency(editBalance)}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Profit</span>
                <span className="font-mono">+{formatCurrency(editProfit)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setEditSale(null)}>
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
