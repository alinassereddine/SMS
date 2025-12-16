import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Building2, Phone, Mail, MapPin, Package, CreditCard, Receipt, ChevronDown, ChevronRight, Download } from "lucide-react";
import { ExportButton } from "@/components/export-button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Supplier, PurchaseInvoice, Payment, Product } from "@shared/schema";

type PurchaseItem = {
  id: string;
  invoiceId: string;
  itemId: string;
  unitPrice: number;
  imei: string;
  product: Product | null;
};

type PurchaseWithItems = PurchaseInvoice & {
  items: PurchaseItem[];
  itemCount: number;
};

type LedgerEntry = {
  id: string;
  date: string;
  type: "purchase" | "payment";
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  referenceId: string;
};

type SupplierSummary = {
  supplier: Supplier;
  purchases: PurchaseWithItems[];
  payments: Payment[];
  ledger: LedgerEntry[];
  totalPurchases: number;
  totalPayments: number;
};

export default function SupplierDetails() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("purchases");

  const { data, isLoading, error } = useQuery<SupplierSummary>({
    queryKey: ["/api/suppliers", id, "summary"],
    queryFn: async () => {
      const res = await fetch(`/api/suppliers/${id}/summary`);
      if (!res.ok) throw new Error("Failed to fetch supplier details");
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Link href="/suppliers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Suppliers
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Supplier not found or error loading data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { supplier, purchases, payments, ledger, totalPurchases, totalPayments } = data;

  const totalPurchaseAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPaidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/suppliers">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-supplier-name">{supplier.name}</h1>
            <p className="text-sm text-muted-foreground">Supplier Details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={ledger}
            filename={`supplier_${supplier.name.replace(/\s+/g, '_')}_ledger`}
            columns={[
              { key: "date", header: "Date", format: (v) => v ? new Date(v).toLocaleDateString() : "" },
              { key: "type", header: "Type" },
              { key: "description", header: "Description" },
              { key: "debit", header: "Debit", format: (v) => v > 0 ? (v / 100).toFixed(2) : "" },
              { key: "credit", header: "Credit", format: (v) => v > 0 ? (v / 100).toFixed(2) : "" },
              { key: "runningBalance", header: "Balance", format: (v) => (v / 100).toFixed(2) },
            ]}
          />
          <Badge 
            variant={(supplier.balance || 0) > 0 ? "destructive" : "secondary"}
            className="text-base px-3 py-1"
          >
            Balance: {formatCurrency(supplier.balance || 0)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {supplier.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span>{supplier.phone}</span>
              </div>
            )}
            {supplier.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span>{supplier.email}</span>
              </div>
            )}
            {supplier.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span>{supplier.address}</span>
              </div>
            )}
            {!supplier.phone && !supplier.email && !supplier.address && (
              <p className="text-muted-foreground">No contact info</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalPurchases}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(totalPurchaseAmount)} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Total Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalPayments}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(totalPaidAmount)} paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${(supplier.balance || 0) > 0 ? "text-destructive" : "text-emerald-600"}`}>
              {formatCurrency(supplier.balance || 0)}
            </p>
            <p className="text-sm text-muted-foreground">
              {(supplier.balance || 0) > 0 ? "We Owe" : "Settled"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="purchases" data-testid="tab-purchases">
            Purchase History ({totalPurchases})
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            Payment History ({totalPayments})
          </TabsTrigger>
          <TabsTrigger value="ledger" data-testid="tab-ledger">
            Balance Breakdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No purchases yet</p>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-2">
                    {purchases.map((purchase) => {
                      const balance = purchase.totalAmount - (purchase.paidAmount || 0);
                      return (
                        <Collapsible key={purchase.id}>
                          <div className="border rounded-md" data-testid={`row-purchase-${purchase.id}`}>
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between gap-4 p-3 hover-elevate">
                                <div className="flex items-center gap-4 flex-wrap">
                                  <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                                  <span className="font-mono font-medium">{purchase.invoiceNumber}</span>
                                  <span className="text-muted-foreground text-sm">{formatDate(purchase.date)}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {purchase.itemCount} item(s)
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 flex-wrap">
                                  <span className="font-mono">{formatCurrency(purchase.totalAmount)}</span>
                                  {balance > 0 ? (
                                    <Badge variant="secondary" className="text-amber-600">
                                      Due: {formatCurrency(balance)}
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-emerald-600">
                                      Paid
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="border-t bg-muted/30 p-3">
                                <p className="text-sm font-medium mb-2">Purchased Items:</p>
                                <div className="space-y-1">
                                  {purchase.items.map((item, idx) => (
                                    <div key={item.id || idx} className="flex items-center justify-between gap-2 text-sm py-1 px-2 rounded bg-background">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium">
                                          {item.product?.name || "Unknown Product"}
                                        </span>
                                        {item.product?.brand && (
                                          <span className="text-muted-foreground">({item.product.brand})</span>
                                        )}
                                        {item.imei && (
                                          <Badge variant="outline" className="font-mono text-xs">
                                            IMEI: {item.imei}
                                          </Badge>
                                        )}
                                      </div>
                                      <span className="font-mono text-muted-foreground">
                                        {formatCurrency(item.unitPrice)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No payments yet</p>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => {
                        const isRefund = payment.transactionType === "refund";
                        return (
                          <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                            <TableCell>{formatDate(payment.date)}</TableCell>
                            <TableCell>
                              <Badge variant={isRefund ? "destructive" : "default"}>
                                {isRefund ? "Refund" : "Payment"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{payment.paymentMethod}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {payment.reference || "-"}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${
                              isRefund 
                                ? "text-emerald-600 dark:text-emerald-400" 
                                : "text-red-600 dark:text-red-400"
                            }`}>
                              {isRefund ? "+" : "-"}{formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                              {payment.notes || "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">
                A chronological view of all transactions affecting the supplier balance
              </p>
            </CardHeader>
            <CardContent>
              {ledger.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No transactions yet</p>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit (+)</TableHead>
                        <TableHead className="text-right">Credit (-)</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.map((entry) => (
                        <TableRow key={entry.id} data-testid={`row-ledger-${entry.id}`}>
                          <TableCell>{formatDate(entry.date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {entry.type === "purchase" ? (
                                <Package className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <CreditCard className="h-3 w-3 text-muted-foreground" />
                              )}
                              {entry.description}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.debit > 0 ? (
                              <span className="text-amber-600">+{formatCurrency(entry.debit)}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.credit > 0 ? (
                              <span className="text-emerald-600">-{formatCurrency(entry.credit)}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            <span className={entry.runningBalance > 0 ? "text-destructive" : ""}>
                              {formatCurrency(entry.runningBalance)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
