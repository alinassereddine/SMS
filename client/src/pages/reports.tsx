import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Package,
  Users,
  Truck,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Product, Customer, Supplier } from "@shared/schema";

interface ReportSummary {
  totalRevenue: number;
  totalProfit: number;
  totalPurchases: number;
  totalExpenses: number;
  customerPayments: number;
  supplierPayments: number;
  netCashFlow: number;
  salesCount: number;
  purchaseCount: number;
  expenseCount: number;
  profitMargin: number;
}

interface SalesTrendData {
  date: string;
  label: string;
  revenue: number;
  profit: number;
  count: number;
}

interface TopProduct {
  productId: string;
  revenue: number;
  profit: number;
  count: number;
  product?: Product;
}

interface TopCustomer {
  customerId: string;
  revenue: number;
  profit: number;
  count: number;
  customer?: Customer;
}

interface SupplierStats {
  supplierId: string;
  totalPurchases: number;
  invoiceCount: number;
  supplier?: Supplier;
}

interface PaymentTrend {
  date: string;
  label: string;
  incoming: number;
  outgoing: number;
  net: number;
}

interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7days" },
  { label: "Last 30 Days", value: "30days" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "This Year", value: "thisYear" },
];

function getDateRange(preset: string): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split("T")[0];
  let startDate: string;

  switch (preset) {
    case "today":
      startDate = endDate;
      break;
    case "7days":
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split("T")[0];
      break;
    case "30days":
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      startDate = monthAgo.toISOString().split("T")[0];
      break;
    case "thisMonth":
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      break;
    case "lastMonth":
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      startDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`;
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate,
        endDate: lastMonthEnd.toISOString().split("T")[0],
      };
    case "thisYear":
      startDate = `${now.getFullYear()}-01-01`;
      break;
    default:
      const defaultStart = new Date(now);
      defaultStart.setDate(defaultStart.getDate() - 30);
      startDate = defaultStart.toISOString().split("T")[0];
  }

  return { startDate, endDate };
}

export default function Reports() {
  const [datePreset, setDatePreset] = useState("30days");
  const [groupBy, setGroupBy] = useState("day");
  const [activeTab, setActiveTab] = useState("overview");

  const { startDate, endDate } = useMemo(() => getDateRange(datePreset), [datePreset]);

  const { data: summary, isLoading: summaryLoading } = useQuery<ReportSummary>({
    queryKey: ["/api/reports/summary", { startDate, endDate }],
  });

  const { data: salesTrends = [], isLoading: trendsLoading } = useQuery<SalesTrendData[]>({
    queryKey: ["/api/reports/sales-trends", { startDate, endDate, groupBy }],
  });

  const { data: topProducts = [] } = useQuery<TopProduct[]>({
    queryKey: ["/api/reports/top-products", { startDate, endDate, limit: "5" }],
  });

  const { data: topCustomers = [] } = useQuery<TopCustomer[]>({
    queryKey: ["/api/reports/top-customers", { startDate, endDate, limit: "5" }],
  });

  const { data: supplierAnalysis = [] } = useQuery<SupplierStats[]>({
    queryKey: ["/api/reports/supplier-analysis", { startDate, endDate }],
  });

  const { data: paymentTrends = [] } = useQuery<PaymentTrend[]>({
    queryKey: ["/api/reports/payment-trends", { startDate, endDate }],
  });

  const { data: expensesByCategory = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ["/api/reports/expenses-by-category", { startDate, endDate }],
  });

  const defaultSummary: ReportSummary = {
    totalRevenue: 0,
    totalProfit: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    customerPayments: 0,
    supplierPayments: 0,
    netCashFlow: 0,
    salesCount: 0,
    purchaseCount: 0,
    expenseCount: 0,
    profitMargin: 0,
  };

  const displaySummary = summary || defaultSummary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Analyze your business performance"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="w-40" data-testid="select-date-preset">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value} data-testid={`option-${preset.value}`}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(displaySummary.totalRevenue)}
          icon={DollarSign}
          trend={{ value: displaySummary.profitMargin, label: "profit margin" }}
          iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Total Profit"
          value={formatCurrency(displaySummary.totalProfit)}
          icon={TrendingUp}
          trend={{ value: displaySummary.salesCount, label: "sales" }}
          iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Total Purchases"
          value={formatCurrency(displaySummary.totalPurchases)}
          icon={Package}
          trend={{ value: displaySummary.purchaseCount, label: "invoices" }}
          iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          isLoading={summaryLoading}
        />
        <MetricCard
          title="Net Cash Flow"
          value={formatCurrency(displaySummary.netCashFlow)}
          icon={displaySummary.netCashFlow >= 0 ? TrendingUp : TrendingDown}
          iconClassName={displaySummary.netCashFlow >= 0 
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-red-500/10 text-red-600 dark:text-red-400"
          }
          isLoading={summaryLoading}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products">
            <Package className="h-4 w-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger value="parties" data-testid="tab-parties">
            <Users className="h-4 w-4 mr-2" />
            Parties
          </TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-expenses">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Group by:</span>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-28" data-testid="select-group-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Sales Trends</CardTitle>
                <Badge variant="secondary" className="text-xs">Revenue & Profit</Badge>
              </CardHeader>
              <CardContent className="pt-4">
                {trendsLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Loading chart...</div>
                  </div>
                ) : salesTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        className="text-muted-foreground"
                        tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => `Date: ${label}`}
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--chart-1))" 
                        name="Revenue"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="hsl(var(--chart-2))" 
                        name="Profit"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No sales data for this period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Payment Flow</CardTitle>
                <Badge variant="secondary" className="text-xs">In vs Out</Badge>
              </CardHeader>
              <CardContent className="pt-4">
                {paymentTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={paymentTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        className="text-muted-foreground"
                        tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="incoming" fill="hsl(var(--chart-2))" name="Received" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="outgoing" fill="hsl(var(--chart-5))" name="Paid Out" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No payment data for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                    <ArrowUpRight className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer Payments</p>
                    <p className="text-2xl font-bold" data-testid="text-customer-payments">
                      {formatCurrency(displaySummary.customerPayments)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                    <ArrowDownLeft className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Supplier Payments</p>
                    <p className="text-2xl font-bold" data-testid="text-supplier-payments">
                      {formatCurrency(displaySummary.supplierPayments)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
                    <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold" data-testid="text-total-expenses">
                      {formatCurrency(displaySummary.totalExpenses)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Top Products by Profit</CardTitle>
                <Badge variant="secondary" className="text-xs">Top 5</Badge>
              </CardHeader>
              <CardContent className="pt-4">
                {topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {topProducts.map((item, index) => (
                      <div 
                        key={item.productId} 
                        className="flex items-center gap-4"
                        data-testid={`row-top-product-${item.productId}`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.product?.name || "Unknown Product"}</p>
                          <p className="text-sm text-muted-foreground">{item.count} sold</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(item.profit)}
                          </p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(item.revenue)} rev</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No product data for this period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Product Revenue Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={topProducts.map(p => ({
                          name: p.product?.name || "Unknown",
                          value: p.revenue,
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name.slice(0, 10)}${name.length > 10 ? '...' : ''} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
                      >
                        {topProducts.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="parties" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Top Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-4">
                {topCustomers.length > 0 ? (
                  <div className="space-y-4">
                    {topCustomers.map((item, index) => (
                      <div 
                        key={item.customerId} 
                        className="flex items-center gap-4"
                        data-testid={`row-top-customer-${item.customerId}`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.customer?.name || "Unknown Customer"}</p>
                          <p className="text-sm text-muted-foreground">{item.count} purchases</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-medium">{formatCurrency(item.revenue)}</p>
                          <p className="text-sm text-muted-foreground text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(item.profit)} profit
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No customer data for this period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Supplier Analysis</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-4">
                {supplierAnalysis.length > 0 ? (
                  <div className="space-y-4">
                    {supplierAnalysis.slice(0, 5).map((item, index) => (
                      <div 
                        key={item.supplierId} 
                        className="flex items-center gap-4"
                        data-testid={`row-supplier-${item.supplierId}`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.supplier?.name || "Unknown Supplier"}</p>
                          <p className="text-sm text-muted-foreground">{item.invoiceCount} invoices</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-medium">{formatCurrency(item.totalPurchases)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No supplier data for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Expenses by Category</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {displaySummary.expenseCount} expenses
                </Badge>
              </CardHeader>
              <CardContent className="pt-4">
                {expensesByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="amount"
                        nameKey="category"
                        label={({ category, percentage }) => `${category} ${percentage}%`}
                        labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
                      >
                        {expensesByCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No expense data for this period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {expensesByCategory.length > 0 ? (
                  <div className="space-y-4">
                    {expensesByCategory.map((item, index) => (
                      <div 
                        key={item.category} 
                        className="flex items-center gap-4"
                        data-testid={`row-expense-category-${index}`}
                      >
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <p className="font-medium">{item.category}</p>
                            <p className="font-mono text-sm">{formatCurrency(item.amount)}</p>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${item.percentage}%`,
                                backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {item.percentage}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No expense data for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
