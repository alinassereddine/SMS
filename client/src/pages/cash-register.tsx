import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CreditCard, DollarSign, Clock, CheckCircle, AlertCircle, Play, Square, MoreHorizontal, Pencil, Download, Plus, Minus, ArrowDownCircle, ArrowUpCircle, History } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDateInput, formatDateTime, generateSessionNumber, parseDateValue } from "@/lib/utils";
import type { CashRegisterSession } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

function exportSessionToCSV(session: CashRegisterSession) {
  const formatValue = (v: any) => v === null || v === undefined ? "" : String(v);
  const escapeCSV = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const rows = [
    ["Session Details"],
    ["Session Number", session.sessionNumber],
    ["Status", session.status],
    ["Opened At", session.openedAt ? new Date(session.openedAt).toLocaleString() : ""],
    ["Closed At", session.closedAt ? new Date(session.closedAt).toLocaleString() : ""],
    ["Opened By", session.openedBy || ""],
    ["Closed By", session.closedBy || ""],
    [""],
    ["Financial Summary"],
    ["Opening Balance", ((session.openingBalance || 0) / 100).toFixed(2)],
    ["Expected Balance", ((session.expectedBalance || 0) / 100).toFixed(2)],
    ["Actual Balance", session.actualBalance !== null ? ((session.actualBalance || 0) / 100).toFixed(2) : ""],
    ["Closing Balance", session.closingBalance !== null ? ((session.closingBalance || 0) / 100).toFixed(2) : ""],
    ["Difference", session.difference !== null ? ((session.difference || 0) / 100).toFixed(2) : ""],
    [""],
    ["Notes", session.notes || ""],
  ];

  const csv = rows.map(row => row.map(cell => escapeCSV(formatValue(cell))).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = `cash_register_${session.sessionNumber}_${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type DatePreset = 'today' | 'week' | 'month' | 'year' | 'all';

function getDateRange(preset: DatePreset): { from: Date | null; to: Date | null } {
  const now = new Date();
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  const to = endOfDay(now);

  switch (preset) {
    case 'today': {
      const today = startOfDay(now);
      return { from: today, to };
    }
    case 'week': {
      const weekStart = startOfDay(new Date(now));
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { from: weekStart, to };
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: monthStart, to };
    }
    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return { from: yearStart, to };
    }
    case 'all':
    default:
      return { from: null, to: null };
  }
}

interface SessionTransaction {
  id: string;
  type: 'sale' | 'payment' | 'supplier_payment' | 'purchase' | 'expense' | 'opening';
  description: string;
  amount: number;
  cashAmount: number;
  paymentMethod: string;
  date: string;
  customerName?: string;
  supplierName?: string;
  products?: string;
  itemCount?: number;
  note?: string;
}

interface ActiveSessionWithDetails extends CashRegisterSession {
  transactions?: SessionTransaction[];
  summary?: {
    salesCount: number;
    paymentsCount: number;
    purchasesCount: number;
    expensesCount: number;
    salesCash: number;
    paymentsCash: number;
    purchasesCash: number;
    expensesCash: number;
  };
}

type CategoryFilter = "all" | "sale" | "payment" | "supplier_payment" | "purchase" | "expense" | "opening";

export default function CashRegister() {
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [actualBalance, setActualBalance] = useState(0);
  const [closeNotes, setCloseNotes] = useState("");
  const [editSession, setEditSession] = useState<CashRegisterSession | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const { toast } = useToast();

  const { data: sessions = [], isLoading } = useQuery<CashRegisterSession[]>({
    queryKey: ["/api/cash-register"],
  });

  const { data: activeSession } = useQuery<ActiveSessionWithDetails | null>({
    queryKey: ["/api/cash-register/active"],
  });

  const openSessionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/cash-register", {
        sessionNumber: generateSessionNumber(),
        openingBalance,
        openedBy: "admin",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
      setIsOpenDialogOpen(false);
      setOpeningBalance(0);
      toast({ title: "Cash register session opened" });
    },
    onError: () => {
      toast({ title: "Failed to open session", variant: "destructive" });
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) return;
      return apiRequest("POST", `/api/cash-register/${activeSession.id}/close`, {
        actualBalance,
        notes: closeNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
      setIsCloseDialogOpen(false);
      setActualBalance(0);
      setCloseNotes("");
      toast({ title: "Cash register session closed" });
    },
    onError: () => {
      toast({ title: "Failed to close session", variant: "destructive" });
    },
  });

  const handleOpenClose = () => {
    if (activeSession) {
      setActualBalance(activeSession.expectedBalance || 0);
      setIsCloseDialogOpen(true);
    } else {
      setIsOpenDialogOpen(true);
    }
  };

  const editDateMutation = useMutation({
    mutationFn: async (data: { id: string; openedAt: string }) => {
      return apiRequest("PATCH", `/api/cash-register/${data.id}/date`, { openedAt: data.openedAt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
      setEditSession(null);
      toast({ title: "Session date updated" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to update session date", variant: "destructive" });
    },
  });

  const handleOpenEditDate = (session: CashRegisterSession) => {
    setEditSession(session);
    setEditDate(formatDateInput(session.openedAt));
  };

  const handleSaveEditDate = () => {
    if (!editSession) return;
    editDateMutation.mutate({ id: editSession.id, openedAt: editDate });
  };

  const historyColumns: Column<CashRegisterSession>[] = [
    {
      key: "sessionNumber",
      header: "Session",
      render: (session) => (
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            session.status === "open" 
              ? "bg-emerald-500/10" 
              : "bg-gray-500/10"
          }`}>
            <CreditCard className={`h-4 w-4 ${
              session.status === "open" 
                ? "text-emerald-600 dark:text-emerald-400" 
                : "text-gray-600 dark:text-gray-400"
            }`} />
          </div>
          <div>
            <p className="font-mono text-sm font-medium">{session.sessionNumber}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(session.openedAt)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (session) => <StatusBadge status={session.status} />,
    },
    {
      key: "opening",
      header: "Opening",
      render: (session) => (
        <span className="font-mono text-sm">
          {formatCurrency(session.openingBalance)}
        </span>
      ),
    },
    {
      key: "closing",
      header: "Closing",
      render: (session) => (
        <span className="font-mono text-sm">
          {session.closingBalance !== null ? formatCurrency(session.closingBalance) : "-"}
        </span>
      ),
    },
    {
      key: "difference",
      header: "Difference",
      render: (session) => {
        if (session.difference === null) return "-";
        const diff = session.difference;
        return (
          <span className={`font-mono text-sm font-medium ${
            diff === 0 
              ? "text-emerald-600 dark:text-emerald-400" 
              : diff > 0 
              ? "text-blue-600 dark:text-blue-400"
              : "text-red-600 dark:text-red-400"
          }`}>
            {diff > 0 ? "+" : ""}{formatCurrency(diff)}
          </span>
        );
      },
    },
    {
      key: "closedAt",
      header: "Closed",
      render: (session) => (
        <span className="text-sm text-muted-foreground">
          {session.closedAt ? formatDateTime(session.closedAt) : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (session) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-actions-${session.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportSessionToCSV(session)} data-testid={`button-export-${session.id}`}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleOpenEditDate(session)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Date
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'opening': return 'Opening Balance';
      case 'sale': return 'Sale';
      case 'payment': return 'Customer Payment';
      case 'supplier_payment': return 'Supplier Payment';
      case 'purchase': return 'Purchase';
      case 'expense': return 'Expense';
      default: return type;
    }
  };

  const allTransactions: SessionTransaction[] = activeSession?.transactions || [];
  
  const openingTransaction: SessionTransaction = {
    id: 'opening',
    type: 'opening',
    description: 'Starting balance',
    amount: activeSession?.openingBalance || 0,
    cashAmount: 0,
    paymentMethod: '',
    date: activeSession?.openedAt ? String(activeSession.openedAt) : new Date().toISOString(),
    note: 'Starting balance',
  };

  const transactionsWithOpening = activeSession 
    ? [openingTransaction, ...allTransactions]
    : [];

  const sortedTransactions = [...transactionsWithOpening].sort((a, b) => {
    if (a.type === 'opening' && b.type !== 'opening') return -1;
    if (b.type === 'opening' && a.type !== 'opening') return 1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const { from: dateFrom, to: dateTo } = getDateRange(datePreset);
  
  const filteredTransactions = sortedTransactions.filter(tx => {
    // Category filter
    if (categoryFilter !== "all" && tx.type !== categoryFilter) {
      return false;
    }
    // Date filter (opening transaction always included for balance calculation)
    if (tx.type === 'opening') {
      return true;
    }
    const txDate = parseDateValue(tx.date);
    if (dateFrom && (!txDate || txDate < dateFrom)) {
      return false;
    }
    if (dateTo && (!txDate || txDate > dateTo)) {
      return false;
    }
    return true;
  });

  let runningBalance = activeSession?.openingBalance || 0;
  const transactionsWithBalance = filteredTransactions.map((tx) => {
    if (tx.type === 'opening') {
      // Opening balance row - balance stays at opening amount
    } else {
      runningBalance += tx.cashAmount;
    }
    return { ...tx, balance: runningBalance };
  });

  const totalInflows = allTransactions
    .filter(tx => tx.cashAmount > 0)
    .reduce((sum, tx) => sum + tx.cashAmount, 0);

  const totalOutflows = allTransactions
    .filter(tx => tx.cashAmount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.cashAmount), 0);

  const filteredBalance = transactionsWithBalance.length > 0
    ? transactionsWithBalance[transactionsWithBalance.length - 1].balance
    : activeSession?.openingBalance || 0;

  const formatDate = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="space-y-6">
      {activeSession ? (
        <>
          <PageHeader 
            title={`Cash Register - ${formatDate(activeSession.openedAt)}`} 
            description={`Session ${activeSession.sessionNumber}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setIsHistoryOpen(true)} data-testid="button-view-history">
                <History className="h-4 w-4 mr-2" />
                View History
              </Button>
              <Button variant="outline" onClick={() => handleOpenEditDate(activeSession)} data-testid="button-edit-date">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Open Date
              </Button>
              <Button 
                onClick={handleOpenClose}
                variant="destructive"
                data-testid="button-close-session"
              >
                <Square className="h-4 w-4 mr-2" />
                Close Register
              </Button>
            </div>
          </PageHeader>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-1">Opening Balance</p>
                <p className="text-2xl font-bold font-mono">
                  {formatCurrency(activeSession.openingBalance)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-1">Total Inflows</p>
                <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalInflows)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-1">Total Outflows</p>
                <p className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
                  {formatCurrency(totalOutflows)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-foreground text-background">
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-1">Current Balance</p>
                <p className="text-2xl font-bold font-mono">
                  {formatCurrency(activeSession.expectedBalance || activeSession.openingBalance)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Transactions</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                  <SelectTrigger className="w-36" data-testid="select-date-filter">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
                  <SelectTrigger className="w-44" data-testid="select-category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="opening">Opening Balance</SelectItem>
                    <SelectItem value="sale">Sales</SelectItem>
                    <SelectItem value="payment">Customer Payments</SelectItem>
                    <SelectItem value="supplier_payment">Supplier Payments</SelectItem>
                    <SelectItem value="purchase">Purchases</SelectItem>
                    <SelectItem value="expense">Expenses</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => exportSessionToCSV(activeSession)} data-testid="button-export-current">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground mb-1">Filtered Balance</p>
                <p className="text-xs text-muted-foreground mb-2">Opening balance plus all filtered inflows/outflows</p>
                <p className="text-2xl font-bold font-mono">{formatCurrency(filteredBalance)}</p>
              </CardContent>
            </Card>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead className="w-20">Time</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead>Customer / Supplier</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-28 text-right">Amount</TableHead>
                    <TableHead className="w-28 text-right">Balance</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsWithBalance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No transactions recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactionsWithBalance.map((tx) => (
                      <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                        <TableCell className="text-sm">{formatDate(tx.date)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatTime(tx.date)}</TableCell>
                        <TableCell>
                          <span className="text-sm">{getCategoryLabel(tx.type)}</span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {tx.customerName || tx.supplierName || "—"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {tx.products || "—"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {tx.note || tx.description || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.type === 'opening' ? (
                            <span className="font-mono text-sm text-muted-foreground">
                              {formatCurrency(0)}
                            </span>
                          ) : (
                            <span className={`font-mono text-sm font-medium ${
                              tx.cashAmount >= 0 
                                ? "text-emerald-600 dark:text-emerald-400" 
                                : "text-red-600 dark:text-red-400"
                            }`}>
                              {tx.cashAmount >= 0 ? "+" : ""}{formatCurrency(tx.cashAmount)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono text-sm font-medium">
                            {formatCurrency(tx.balance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {tx.type !== 'opening' && (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-edit-tx-${tx.id}`}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      ) : (
        <>
          <PageHeader title="Cash Register" description="Manage cash register sessions">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsHistoryOpen(true)} data-testid="button-view-history">
                <History className="h-4 w-4 mr-2" />
                View History
              </Button>
              <Button 
                onClick={handleOpenClose}
                data-testid="button-open-session"
              >
                <Play className="h-4 w-4 mr-2" />
                Open Session
              </Button>
            </div>
          </PageHeader>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{sessions.length}</div>
                    <p className="text-xs text-muted-foreground">Total Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {sessions.filter(s => s.status === "closed" && s.difference === 0).length}
                    </div>
                    <p className="text-xs text-muted-foreground">Balanced Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {sessions.filter(s => s.status === "closed" && s.difference !== 0).length}
                    </div>
                    <p className="text-xs text-muted-foreground">With Discrepancy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-dashed">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Active Session</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  Open a cash register session to start recording sales, payments, and expenses.
                </p>
                <Button onClick={handleOpenClose} data-testid="button-open-session-cta">
                  <Play className="h-4 w-4 mr-2" />
                  Open Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Session History</DialogTitle>
            <DialogDescription>
              View all past cash register sessions
            </DialogDescription>
          </DialogHeader>
          <DataTable
            columns={historyColumns}
            data={sessions}
            isLoading={isLoading}
            emptyMessage="No sessions found"
            emptyDescription="Open your first cash register session."
            getRowKey={(s) => s.id}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Open Cash Register Session</DialogTitle>
            <DialogDescription>
              Enter the opening cash balance to start a new session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Opening Balance</label>
              <CurrencyInput value={openingBalance} onChange={setOpeningBalance} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0, 10000, 20000, 50000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setOpeningBalance(amount)}
                >
                  {formatCurrency(amount)}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => openSessionMutation.mutate()}
              disabled={openSessionMutation.isPending}
              data-testid="button-confirm-open"
            >
              {openSessionMutation.isPending ? "Opening..." : "Open Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close Cash Register Session</DialogTitle>
            <DialogDescription>
              Count your cash and enter the actual balance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Opening Balance</span>
                <span className="font-mono">{formatCurrency(activeSession?.openingBalance || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expected Balance</span>
                <span className="font-mono font-medium">
                  {formatCurrency(activeSession?.expectedBalance || activeSession?.openingBalance || 0)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Actual Balance (Count)</label>
              <CurrencyInput value={actualBalance} onChange={setActualBalance} />
            </div>

            {activeSession && (
              <div className={`p-4 rounded-lg ${
                actualBalance === (activeSession.expectedBalance || activeSession.openingBalance)
                  ? "bg-emerald-500/10"
                  : "bg-amber-500/10"
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Difference</span>
                  <span className={`font-mono font-bold text-lg ${
                    actualBalance === (activeSession.expectedBalance || activeSession.openingBalance)
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}>
                    {actualBalance >= (activeSession.expectedBalance || activeSession.openingBalance) ? "+" : ""}
                    {formatCurrency(actualBalance - (activeSession.expectedBalance || activeSession.openingBalance))}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Notes (if discrepancy)</label>
              <Textarea 
                placeholder="Explain any discrepancy..." 
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => closeSessionMutation.mutate()}
              disabled={closeSessionMutation.isPending}
              variant="destructive"
              data-testid="button-confirm-close"
            >
              {closeSessionMutation.isPending ? "Closing..." : "Close Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSession} onOpenChange={() => setEditSession(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Session Date</DialogTitle>
            <DialogDescription>
              Edit the opening date for session{" "}
              <span className="font-mono font-medium">{editSession?.sessionNumber}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Opening Date</span>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                data-testid="input-edit-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSession(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEditDate}
              disabled={editDateMutation.isPending}
              data-testid="button-save-edit-date"
            >
              {editDateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
