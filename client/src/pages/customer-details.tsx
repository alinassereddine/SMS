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
import { ArrowLeft, User, Phone, Mail, MapPin, ShoppingCart, CreditCard, Receipt, ChevronDown, ChevronRight, Download } from "lucide-react";
import { ExportButton } from "@/components/export-button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { Customer, Sale, Payment, Product } from "@shared/schema";

type SaleItem = {
  id: string;
  saleId: string;
  itemId: string;
  unitPrice: number;
  purchasePrice: number;
  imei: string;
  product: Product | null;
};

type SaleWithItems = Sale & {
  items: SaleItem[];
  itemCount: number;
};

type LedgerEntry = {
  id: string;
  date: string;
  type: "sale" | "payment";
  transactionType?: "payment" | "refund";
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  referenceId: string;
};

type CustomerSummary = {
  customer: Customer;
  sales: SaleWithItems[];
  payments: Payment[];
  ledger: LedgerEntry[];
  totalSales: number;
  totalPayments: number;
};

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("orders");
  const { can } = useAuth();

  // Check if user has permission to view customer details
  if (!can("customers:details")) {
    return (
      <div className="space-y-6">
        <Link href="/customers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">You do not have permission to view customer details.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data, isLoading, error } = useQuery<CustomerSummary>({
    queryKey: ["/api/customers", id, "summary"],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}/summary`);
      if (!res.ok) throw new Error("Failed to fetch customer details");
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
        <Link href="/customers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </Link>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Customer not found or error loading data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { customer, sales, payments, ledger, totalSales, totalPayments } = data;

  const totalSalesAmount = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPaidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-customer-name">{customer.name}</h1>
            <p className="text-sm text-muted-foreground">Customer Details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={ledger}
            filename={`customer_${customer.name.replace(/\s+/g, '_')}_ledger`}
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
            variant={(customer.balance || 0) > 0 ? "destructive" : "secondary"}
            className="text-base px-3 py-1"
          >
            Balance: {formatCurrency(customer.balance || 0)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span>{customer.address}</span>
              </div>
            )}
            {!customer.phone && !customer.email && !customer.address && (
              <p className="text-muted-foreground">No contact info</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalSales}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(totalSalesAmount)} total</p>
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
            <p className="text-sm text-muted-foreground">{formatCurrency(totalPaidAmount)} received</p>
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
            <p className={`text-2xl font-bold ${(customer.balance || 0) > 0 ? "text-destructive" : "text-emerald-600"}`}>
              {formatCurrency(customer.balance || 0)}
            </p>
            <p className="text-sm text-muted-foreground">
              {(customer.balance || 0) > 0 ? "Outstanding" : "Settled"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders" data-testid="tab-orders">
            Order History ({totalSales})
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            Payment History ({totalPayments})
          </TabsTrigger>
          <TabsTrigger value="ledger" data-testid="tab-ledger">
            Balance Breakdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No orders yet</p>
              ) : (
                <div className="max-h-[600px] overflow-y-auto pr-2">
                  <div className="space-y-2">
                    {sales.map((sale) => {
                      const balance = sale.totalAmount - (sale.paidAmount || 0);
                      return (
                        <Collapsible key={sale.id}>
                          <div className="border rounded-md" data-testid={`row-sale-${sale.id}`}>
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between gap-4 p-3 hover-elevate">
                                <div className="flex items-center gap-4 flex-wrap">
                                  <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                                  <span className="font-mono font-medium">{sale.saleNumber}</span>
                                  <span className="text-muted-foreground text-sm">{formatDate(sale.date)}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {sale.itemCount} item(s)
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 flex-wrap">
                                  <span className="font-mono">{formatCurrency(sale.totalAmount)}</span>
                                  {(sale.paidAmount || 0) > 0 && balance > 0 && (
                                    <Badge variant="secondary" className="text-emerald-600">
                                      Paid: {formatCurrency(sale.paidAmount || 0)}
                                    </Badge>
                                  )}
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
                                <p className="text-sm font-medium mb-2">Sold Items:</p>
                                <div className="space-y-1">
                                  {sale.items.map((item, idx) => (
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
                </div>
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
                <div className="max-h-[500px] overflow-y-auto pr-2">
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
                        const amount = Math.abs(payment.amount);
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
                            <TableCell className={`text-right font-mono ${isRefund
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                              }`}>
                              {isRefund ? "+" : "-"}{formatCurrency(amount)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                              {payment.notes || "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">
                A chronological view of all transactions affecting the customer balance
              </p>
            </CardHeader>
            <CardContent>
              {ledger.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No transactions yet</p>
              ) : (
                <div className="max-h-[500px] overflow-y-auto pr-2">
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
                              {entry.type === "sale" ? (
                                <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <CreditCard className="h-3 w-3 text-muted-foreground" />
                              )}
                              {entry.description}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.debit > 0 ? (
                              <span className="text-emerald-600">+{formatCurrency(entry.debit)}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.credit > 0 ? (
                              <span className="text-red-600">-{formatCurrency(entry.credit)}</span>
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
