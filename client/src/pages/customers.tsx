import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Pencil, Trash2, Phone, Eye, Upload, Download } from "lucide-react";
import { Link } from "wouter";
import { PageHeader } from "@/components/page-header";
import { DataTable, Column } from "@/components/data-table";
import { SearchInput } from "@/components/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { Customer } from "@shared/schema";

const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function Customers() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { can } = useAuth();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      return apiRequest("POST", "/api/customers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Customer created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create customer", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CustomerFormValues }) => {
      return apiRequest("PATCH", `/api/customers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsDialogOpen(false);
      setEditingCustomer(null);
      form.reset();
      toast({ title: "Customer updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update customer", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Customer deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete customer", variant: "destructive" });
    },
  });

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      form.reset({
        name: customer.name,
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        notes: customer.notes || "",
      });
    } else {
      setEditingCustomer(null);
      form.reset({ name: "", phone: "", email: "", address: "", notes: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: CustomerFormValues) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(search.toLowerCase()) ||
    customer.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const canSeeBalance = can("customers:balance");
  const canSeeDetails = can("customers:details");
  const canDelete = can("customers:delete");
  const canImport = can("customers:write");

  const downloadTemplate = () => {
    const header = ["name", "phone", "email", "address", "notes", "balance"];
    const example = [
      "Walk-in Customer",
      "",
      "",
      "",
      "",
      "0",
    ];
    const example2 = [
      "Ahmed Hassan",
      "+966501234567",
      "ahmed@email.com",
      "Riyadh",
      "VIP",
      "250000",
    ];

    const csv = [header, example, example2]
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
    a.download = "customers-import-template.csv";
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

      const res = await fetch("/api/customers/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Import failed",
          description: body?.error || "Failed to import customers",
          variant: "destructive",
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      const imported = body?.imported ?? 0;
      const totalRows = body?.totalRows ?? 0;
      const errorsCount = Array.isArray(body?.errors) ? body.errors.length : 0;

      toast({
        title: "Import completed",
        description: `Imported ${imported} of ${totalRows} rows${errorsCount ? ` (${errorsCount} errors)` : ""}.`,
      });
    } catch {
      toast({
        title: "Import failed",
        description: "Failed to import customers",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const allColumns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      render: (customer) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
              {getInitials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{customer.name}</p>
            {customer.phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {customer.phone}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (customer) => (
        <span className="text-sm">{customer.email || "-"}</span>
      ),
    },
    ...(canSeeBalance ? [{
      key: "balance",
      header: "Balance",
      render: (customer: Customer) => {
        const balance = customer.balance || 0;
        const isPositive = balance > 0;
        return (
          <div className="text-right">
            <span className={`font-mono text-sm font-medium ${
              isPositive ? "text-emerald-600 dark:text-emerald-400" : balance < 0 ? "text-red-600 dark:text-red-400" : ""
            }`}>
              {formatCurrency(Math.abs(balance))}
            </span>
            {balance !== 0 && (
              <Badge 
                variant="secondary" 
                className={`ml-2 text-xs ${
                  isPositive 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                {isPositive ? "Owes" : "Credit"}
              </Badge>
            )}
          </div>
        );
      },
      className: "text-right",
    }] : []),
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (customer) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-actions-${customer.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canSeeDetails && (
              <DropdownMenuItem asChild>
                <Link href={`/customers/${customer.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleOpenDialog(customer)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem 
                onClick={() => deleteMutation.mutate(customer.id)}
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

  const columns = allColumns;

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description="Manage your customer database">
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
          <Button onClick={() => handleOpenDialog()} data-testid="button-add-customer">
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </PageHeader>

      <div className="flex items-center gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search customers..."
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredCustomers}
        isLoading={isLoading}
        emptyMessage="No customers found"
        emptyDescription="Get started by adding your first customer."
        getRowKey={(c) => c.id}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? "Update customer details" : "Add a new customer to your database"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} data-testid="input-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 890" {...field} data-testid="input-customer-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} data-testid="input-customer-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="123 Main St, City" {...field} data-testid="input-customer-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} data-testid="input-customer-notes" />
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
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-customer"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
