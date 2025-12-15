import { useQuery } from "@tanstack/react-query";
import { 
  DollarSign, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { Sale, PurchaseInvoice, Payment } from "@shared/schema";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardStats {
  totalSales: number;
  totalProfit: number;
  inventoryValue: number;
  inventoryCount: number;
  outstandingCustomerBalance: number;
  outstandingSupplierBalance: number;
  salesCount: number;
  purchaseCount: number;
}

interface RecentActivity {
  type: "sale" | "purchase" | "payment";
  id: string;
  description: string;
  amount: number;
  date: string;
  status: string;
}

const salesData = [
  { name: "Mon", sales: 4000, profit: 1200 },
  { name: "Tue", sales: 3000, profit: 900 },
  { name: "Wed", sales: 5000, profit: 1500 },
  { name: "Thu", sales: 2780, profit: 800 },
  { name: "Fri", sales: 6890, profit: 2100 },
  { name: "Sat", sales: 8390, profit: 2500 },
  { name: "Sun", sales: 3490, profit: 1050 },
];

const categoryData = [
  { name: "Phones", value: 45 },
  { name: "Accessories", value: 25 },
  { name: "Tablets", value: 15 },
  { name: "Other", value: 15 },
];

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/activity"],
  });

  const defaultStats: DashboardStats = {
    totalSales: 0,
    totalProfit: 0,
    inventoryValue: 0,
    inventoryCount: 0,
    outstandingCustomerBalance: 0,
    outstandingSupplierBalance: 0,
    salesCount: 0,
    purchaseCount: 0,
  };

  const displayStats = stats || defaultStats;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard" 
        description="Overview of your business performance"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Sales"
          value={formatCurrency(displayStats.totalSales)}
          icon={DollarSign}
          trend={{ value: 12.5, label: "from last month" }}
          iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          isLoading={statsLoading}
        />
        <MetricCard
          title="Total Profit"
          value={formatCurrency(displayStats.totalProfit)}
          icon={TrendingUp}
          trend={{ value: 8.2, label: "from last month" }}
          iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          isLoading={statsLoading}
        />
        <MetricCard
          title="Inventory Value"
          value={formatCurrency(displayStats.inventoryValue)}
          icon={Package}
          trend={{ value: -2.4, label: "from last month" }}
          iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          isLoading={statsLoading}
        />
        <MetricCard
          title="Available Items"
          value={displayStats.inventoryCount.toString()}
          icon={ShoppingCart}
          iconClassName="bg-purple-500/10 text-purple-600 dark:text-purple-400"
          isLoading={statsLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Sales Overview</CardTitle>
            <Badge variant="secondary" className="text-xs">This Week</Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={false}
                  name="Sales"
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                  name="Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Sales by Category</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <CardTitle className="text-base font-medium">Outstanding Balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Customer Receivables</p>
                  <p className="text-xs text-muted-foreground">Amount customers owe you</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold" data-testid="text-customer-balance">
                  {formatCurrency(displayStats.outstandingCustomerBalance)}
                </p>
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>Receivable</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <Truck className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Supplier Payables</p>
                  <p className="text-xs text-muted-foreground">Amount you owe suppliers</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold" data-testid="text-supplier-balance">
                  {formatCurrency(displayStats.outstandingSupplierBalance)}
                </p>
                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <ArrowDownRight className="h-3 w-3" />
                  <span>Payable</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
            <Badge variant="secondary" className="text-xs">Last 7 days</Badge>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 animate-pulse">
                    <div className="h-8 w-8 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-muted rounded" />
                      <div className="h-2 w-24 bg-muted rounded" />
                    </div>
                    <div className="h-4 w-16 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-center gap-3 p-3 rounded-lg hover-elevate transition-colors"
                    data-testid={`activity-${activity.id}`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      activity.type === "sale" 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : activity.type === "purchase"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    }`}>
                      {activity.type === "sale" ? (
                        <ShoppingCart className="h-4 w-4" />
                      ) : activity.type === "purchase" ? (
                        <Package className="h-4 w-4" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(activity.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        activity.type === "sale" 
                          ? "text-emerald-600 dark:text-emerald-400"
                          : activity.type === "purchase"
                          ? "text-red-600 dark:text-red-400"
                          : ""
                      }`}>
                        {activity.type === "sale" ? "+" : activity.type === "purchase" ? "-" : ""}
                        {formatCurrency(activity.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CreditCard className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
