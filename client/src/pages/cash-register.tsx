import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CreditCard, DollarSign, Clock, CheckCircle, AlertCircle, Play, Square } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDateTime, generateSessionNumber } from "@/lib/utils";
import type { CashRegisterSession } from "@shared/schema";

export default function CashRegister() {
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [actualBalance, setActualBalance] = useState(0);
  const [closeNotes, setCloseNotes] = useState("");
  const { toast } = useToast();

  const { data: sessions = [], isLoading } = useQuery<CashRegisterSession[]>({
    queryKey: ["/api/cash-register"],
  });

  const { data: activeSession } = useQuery<CashRegisterSession | null>({
    queryKey: ["/api/cash-register/active"],
  });

  const openSessionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/cash-register/open", {
        sessionNumber: generateSessionNumber(),
        openingBalance,
        openedBy: "admin",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register"] });
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

  const columns: Column<CashRegisterSession>[] = [
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Cash Register" description="Manage cash register sessions">
        <Button 
          onClick={handleOpenClose}
          variant={activeSession ? "destructive" : "default"}
          data-testid="button-toggle-session"
        >
          {activeSession ? (
            <>
              <Square className="h-4 w-4 mr-2" />
              Close Session
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Open Session
            </>
          )}
        </Button>
      </PageHeader>

      {activeSession && (
        <Card className="border-emerald-500/50 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Session Number</p>
                <p className="font-mono font-medium">{activeSession.sessionNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Opened At</p>
                <p className="font-medium">{formatDateTime(activeSession.openedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Opening Balance</p>
                <p className="font-mono font-medium">{formatCurrency(activeSession.openingBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Expected Balance</p>
                <p className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(activeSession.expectedBalance || activeSession.openingBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      <DataTable
        columns={columns}
        data={sessions}
        isLoading={isLoading}
        emptyMessage="No sessions found"
        emptyDescription="Open your first cash register session."
        getRowKey={(s) => s.id}
      />

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
    </div>
  );
}
