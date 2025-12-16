import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, DollarSign, MoreHorizontal, Trash2, TrendingDown, Calendar, Wallet, Pencil } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, Column } from "@/components/data-table";
import { SearchInput } from "@/components/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
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
import { CurrencyInput } from "@/components/currency-input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { Expense } from "@shared/schema";

const expenseFormSchema = z.object({
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  paymentMethod: z.enum(["cash", "card", "transfer"]),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const expenseCategories = [
  "Rent",
  "Utilities",
  "Salaries",
  "Office Supplies",
  "Marketing",
  "Maintenance",
  "Transportation",
  "Insurance",
  "Other",
];

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(220 70% 50%)",
  "hsl(280 70% 50%)",
  "hsl(320 70% 50%)",
  "hsl(40 70% 50%)",
];

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

export default function Expenses() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDateDialogOpen, setIsEditDateDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editDate, setEditDate] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const { toast } = useToast();

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });
  
  const { from: dateFrom } = getDateRange(datePreset);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "",
      category: "",
      amount: 0,
      paymentMethod: "cash",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      return apiRequest("POST", "/api/expenses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Expense recorded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to record expense", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete expense", variant: "destructive" });
    },
  });

  const updateDateMutation = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      return apiRequest("PATCH", `/api/expenses/${id}`, { date: new Date(date) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsEditDateDialogOpen(false);
      setSelectedExpense(null);
      toast({ title: "Expense date updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update expense date", variant: "destructive" });
    },
  });

  const handleSubmit = (data: ExpenseFormValues) => {
    createMutation.mutate(data);
  };

  const handleEditDate = (expense: Expense) => {
    setSelectedExpense(expense);
    setEditDate(new Date(expense.date).toISOString().split("T")[0]);
    setIsEditDateDialogOpen(true);
  };

  const handleSaveDate = () => {
    if (selectedExpense && editDate) {
      updateDateMutation.mutate({ id: selectedExpense.id, date: editDate });
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch = expense.description.toLowerCase().includes(search.toLowerCase()) ||
        expense.category.toLowerCase().includes(search.toLowerCase());
      const expenseDate = new Date(expense.date);
      const matchesDate = !dateFrom || expenseDate >= dateFrom;
      return matchesSearch && matchesDate;
    });
  }, [expenses, search, dateFrom]);

  const categoryChartData = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const paymentMethodData = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const method = e.paymentMethod === "transfer" ? "Bank Transfer" : 
                     e.paymentMethod.charAt(0).toUpperCase() + e.paymentMethod.slice(1);
      totals[method] = (totals[method] || 0) + e.amount;
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const columns: Column<Expense>[] = [
    {
      key: "description",
      header: "Description",
      render: (expense) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
            <DollarSign className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="font-medium">{expense.description}</p>
            <p className="text-xs text-muted-foreground">{formatDate(expense.date)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (expense) => (
        <Badge variant="secondary" className="text-xs">
          {expense.category}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (expense) => (
        <span className="font-mono text-sm font-medium text-red-600 dark:text-red-400">
          -{formatCurrency(expense.amount)}
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (expense) => (
        <Badge variant="outline" className="text-xs capitalize">
          {expense.paymentMethod}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (expense) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-actions-${expense.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditDate(expense)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Date
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => deleteMutation.mutate(expense.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const avgPerExpense = filteredExpenses.length > 0 ? total / filteredExpenses.length : 0;
    const cashTotal = filteredExpenses
      .filter(e => e.paymentMethod === "cash")
      .reduce((sum, e) => sum + e.amount, 0);
    return { total, avgPerExpense, cashTotal, count: filteredExpenses.length };
  }, [filteredExpenses]);

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Track business expenses">
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-expense">
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-total-expenses">
                  {formatCurrency(stats.total)}
                </div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="text-expense-count">{stats.count}</div>
                <p className="text-xs text-muted-foreground">Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="text-avg-expense">{formatCurrency(stats.avgPerExpense)}</div>
                <p className="text-xs text-muted-foreground">Avg per Expense</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="text-cash-expenses">{formatCurrency(stats.cashTotal)}</div>
                <p className="text-xs text-muted-foreground">Cash Expenses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryChartData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {categoryChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                No data for selected period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethodData.length > 0 ? (
              <div className="space-y-3">
                {paymentMethodData.map((item, index) => {
                  const percentage = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span>{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                No data for selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search expenses..."
          className="max-w-sm"
        />
        <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
          <SelectTrigger className="w-[160px]" data-testid="select-date-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {datePresets.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredExpenses}
        isLoading={isLoading}
        emptyMessage="No expenses found"
        emptyDescription="Record your first expense."
        getRowKey={(e) => e.id}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record a new business expense
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Office supplies" {...field} data-testid="input-expense-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-expense-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expenseCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-expense-method">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} data-testid="input-expense-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  data-testid="button-save-expense"
                >
                  {createMutation.isPending ? "Saving..." : "Add Expense"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDateDialogOpen} onOpenChange={setIsEditDateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense Date</DialogTitle>
            <DialogDescription>
              Change the date for this expense
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                data-testid="input-edit-expense-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsEditDateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDate}
              disabled={updateDateMutation.isPending}
              data-testid="button-save-expense-date"
            >
              {updateDateMutation.isPending ? "Saving..." : "Save Date"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
