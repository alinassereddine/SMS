import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Wallet, MoreHorizontal, Eye, User, Truck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, Column } from "@/components/data-table";
import { SearchInput } from "@/components/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyInput } from "@/components/currency-input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { Payment, Customer, Supplier, PaymentWithEntity } from "@shared/schema";

const paymentFormSchema = z.object({
  type: z.enum(["customer", "supplier"]),
  entityId: z.string().min(1, "Please select a customer or supplier"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  paymentMethod: z.enum(["cash", "card", "transfer", "check"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export default function Payments() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "customer" | "supplier">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: payments = [], isLoading } = useQuery<PaymentWithEntity[]>({
    queryKey: ["/api/payments"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      type: "customer",
      entityId: "",
      amount: 0,
      paymentMethod: "cash",
      reference: "",
      notes: "",
    },
  });

  const paymentType = form.watch("type");

  const createMutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      return apiRequest("POST", "/api/payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Payment recorded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to record payment", variant: "destructive" });
    },
  });

  const handleSubmit = (data: PaymentFormValues) => {
    createMutation.mutate(data);
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesType = typeFilter === "all" || payment.type === typeFilter;
    const matchesSearch = 
      payment.entity?.name?.toLowerCase().includes(search.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const columns: Column<PaymentWithEntity>[] = [
    {
      key: "entity",
      header: "From/To",
      render: (payment) => (
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            payment.type === "customer" 
              ? "bg-emerald-500/10" 
              : "bg-blue-500/10"
          }`}>
            {payment.type === "customer" ? (
              <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div>
            <p className="font-medium">{payment.entity?.name || "Unknown"}</p>
            <p className="text-xs text-muted-foreground capitalize">{payment.type}</p>
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (payment) => (
        <span className={`font-mono text-sm font-medium ${
          payment.type === "customer" 
            ? "text-emerald-600 dark:text-emerald-400" 
            : "text-red-600 dark:text-red-400"
        }`}>
          {payment.type === "customer" ? "+" : "-"}{formatCurrency(payment.amount)}
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (payment) => (
        <Badge variant="outline" className="text-xs capitalize">
          {payment.paymentMethod}
        </Badge>
      ),
    },
    {
      key: "reference",
      header: "Reference",
      render: (payment) => (
        <span className="text-sm text-muted-foreground font-mono">
          {payment.reference || "-"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (payment) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(payment.date)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (payment) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-actions-${payment.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const customerPayments = payments.filter(p => p.type === "customer").reduce((sum, p) => sum + p.amount, 0);
  const supplierPayments = payments.filter(p => p.type === "supplier").reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Track customer and supplier payments">
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-payment">
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">Total Payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(customerPayments)}
            </div>
            <p className="text-xs text-muted-foreground">From Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              -{formatCurrency(supplierPayments)}
            </div>
            <p className="text-xs text-muted-foreground">To Suppliers</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search payments..."
          className="max-w-sm"
        />
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="customer">Customers</TabsTrigger>
            <TabsTrigger value="supplier">Suppliers</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DataTable
        columns={columns}
        data={filteredPayments}
        isLoading={isLoading}
        emptyMessage="No payments found"
        emptyDescription="Record your first payment."
        getRowKey={(p) => p.id}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment from a customer or to a supplier
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Type</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={field.value === "customer" ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => {
                          field.onChange("customer");
                          form.setValue("entityId", "");
                        }}
                      >
                        <User className="h-4 w-4 mr-2" />
                        From Customer
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "supplier" ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => {
                          field.onChange("supplier");
                          form.setValue("entityId", "");
                        }}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        To Supplier
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="entityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{paymentType === "customer" ? "Customer" : "Supplier"}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-entity">
                          <SelectValue placeholder={`Select ${paymentType}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentType === "customer" 
                          ? customers.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                                {(c.balance || 0) > 0 && (
                                  <span className="ml-2 text-muted-foreground">
                                    (Owes {formatCurrency(c.balance || 0)})
                                  </span>
                                )}
                              </SelectItem>
                            ))
                          : suppliers.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                                {(s.balance || 0) > 0 && (
                                  <span className="ml-2 text-muted-foreground">
                                    (Owe {formatCurrency(s.balance || 0)})
                                  </span>
                                )}
                              </SelectItem>
                            ))
                        }
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
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="transfer">Bank Transfer</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Check number, transfer ref..." 
                        {...field} 
                        data-testid="input-payment-reference"
                      />
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
                  data-testid="button-save-payment"
                >
                  {createMutation.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
