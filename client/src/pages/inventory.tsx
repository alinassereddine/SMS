import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Barcode, Package, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import { DataTable, Column } from "@/components/data-table";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { ItemWithProduct } from "@shared/schema";


export default function Inventory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { can } = useAuth();
  const canViewKPIs = can("reports:read");

  const { data: items = [], isLoading } = useQuery<ItemWithProduct[]>({
    queryKey: ["/api/items"],
  });

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.imei.toLowerCase().includes(search.toLowerCase()) ||
      item.product?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<ItemWithProduct>[] = [
    {
      key: "imei",
      header: "IMEI",
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Barcode className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-mono text-sm font-medium" data-testid={`text-imei-${item.id}`}>{item.imei}</p>
            <p className="text-xs text-muted-foreground">{item.product?.name || "Unknown"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "product",
      header: "Product",
      render: (item) => (
        <span className="text-sm">{item.product?.name || "-"}</span>
      ),
    },
    {
      key: "purchasePrice",
      header: "Cost",
      render: (item) => (
        <span className="font-mono text-sm">{formatCurrency(item.purchasePrice)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "purchasedAt",
      header: "Added",
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(item.purchasedAt)}
        </span>
      ),
    },
  ];

  const availableItems = items.filter(i => i.status === "available");
  const availableCount = availableItems.length;
  const availableValue = availableItems.reduce((sum, i) => sum + i.purchasePrice, 0);
  const soldCount = items.filter(i => i.status === "sold").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={`${availableCount} available, ${soldCount} sold. Items are managed through Purchases and Sales.`}
      >
        <ExportButton
          data={filteredItems}
          filename="inventory"
          columns={[
            { key: "imei", header: "IMEI" },
            { key: "product", header: "Product", format: (_, row) => row.product?.name || "" },
            { key: "purchasePrice", header: "Cost", format: (v) => (v / 100).toFixed(2) },
            { key: "status", header: "Status" },
            { key: "purchasedAt", header: "Added", format: (v) => v ? new Date(v).toLocaleDateString() : "" },
          ]}
        />
      </PageHeader>

      {canViewKPIs && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="text-available-count">{availableCount}</div>
                  <p className="text-xs text-muted-foreground">Available Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono" data-testid="text-available-value">{formatCurrency(availableValue)}</div>
                  <p className="text-xs text-muted-foreground">Total Stock Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by IMEI or product..."
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredItems}
        isLoading={isLoading}
        emptyMessage="No items found"
        emptyDescription="Items are added through Purchase Invoices."
        getRowKey={(i) => i.id}
        pageSize={10}
      />

    </div>
  );
}
