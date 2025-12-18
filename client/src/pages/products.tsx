import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Package, MoreHorizontal, Pencil, Trash2, Upload, Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, Column } from "@/components/data-table";
import { SearchInput } from "@/components/search-input";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { Product } from "@shared/schema";

const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  supplier: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  storage: z.string().optional(),
  ram: z.string().optional(),
  condition: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const categories = ["Phones", "Tablets", "Accessories", "Smart Watch", "Laptops", "Other"];
const storageOptions = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"];
const ramOptions = ["1GB", "2GB", "3GB", "4GB", "6GB", "8GB", "10GB", "12GB", "16GB", "24GB", "32GB", "64GB"];
const conditionOptions = ["New", "Used", "Refurbished", "Like New", "Good", "Fair"];

export default function Products() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { can } = useAuth();
  const canDelete = can("products:delete");
  const canImport = can("products:write");

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      supplier: "",
      brand: "",
      category: "",
      storage: "",
      ram: "",
      condition: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const { supplier, storage, ram, condition, ...rest } = data;
      const specifications: Record<string, string> = {};
      if (supplier) specifications.supplier = supplier;
      if (storage && storage !== "none") specifications.storage = storage;
      if (ram && ram !== "none") specifications.ram = ram;
      if (condition && condition !== "none") specifications.condition = condition;
      return apiRequest("POST", "/api/products", { ...rest, specifications });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Product created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create product", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormValues }) => {
      const { supplier, storage, ram, condition, ...rest } = data;
      const specifications: Record<string, string> = {};
      if (supplier) specifications.supplier = supplier;
      if (storage && storage !== "none") specifications.storage = storage;
      if (ram && ram !== "none") specifications.ram = ram;
      if (condition && condition !== "none") specifications.condition = condition;
      return apiRequest("PATCH", `/api/products/${id}`, { ...rest, specifications });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      form.reset();
      toast({ title: "Product updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update product", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
    },
  });

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      const specs = (product.specifications || {}) as Record<string, string>;
      form.reset({
        name: product.name,
        brand: product.brand || "",
        category: product.category || "",
        supplier: specs.supplier || "",
        storage: specs.storage || "",
        ram: specs.ram || "",
        condition: specs.condition || "",
      });
    } else {
      setEditingProduct(null);
      form.reset({ name: "", supplier: "", brand: "", category: "", storage: "", ram: "", condition: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: ProductFormValues) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.brand?.toLowerCase().includes(search.toLowerCase()) ||
    product.category?.toLowerCase().includes(search.toLowerCase())
  );

  const downloadTemplate = () => {
    const header = ["Name", "Supplier", "Brand", "Category", "Storage", "RAM", "Condition"];
    const example = ["iPhone 15 Pro", "Apple Distributor", "Apple", "Phones", "128GB", "8GB", "New"];
    const csv = [header, example]
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
    a.download = "products-import-template.csv";
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

      const res = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Import failed",
          description: body?.error || "Failed to import products",
          variant: "destructive",
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
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
        description: "Failed to import products",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product Name",
      render: (product) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{product.name}</p>
            {(() => {
              const specs = (product.specifications || {}) as Record<string, string>;
              const supplier = specs.supplier;
              const subtitle = [product.brand, supplier].filter(Boolean).join(" • ");
              return subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null;
            })()}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (product) => (
        <span className="text-sm">{product.category || "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (product) => (
        <StatusBadge status={product.archived ? "archived" : "available"} />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (product) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-actions-${product.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleOpenDialog(product)} data-testid={`button-edit-${product.id}`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem 
                onClick={() => deleteMutation.mutate(product.id)}
                className="text-destructive"
                data-testid={`button-delete-${product.id}`}
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

  return (
    <div className="space-y-6">
      <PageHeader title="Products" description="Manage your product catalog">
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
          <Button onClick={() => handleOpenDialog()} data-testid="button-add-product">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </PageHeader>

      <div className="flex items-center gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search products..."
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredProducts}
        isLoading={isLoading}
        emptyMessage="No products found"
        emptyDescription="Get started by adding your first product."
        getRowKey={(p) => p.id}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>
              {editingProduct ? "Update product details" : "Add a new product to your catalog"}
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
                      <Input placeholder="iPhone 15 Pro" {...field} data-testid="input-product-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input placeholder="Apple" {...field} data-testid="input-product-brand" />
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
                        <SelectTrigger data-testid="select-product-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="storage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-product-storage">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {storageOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RAM</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-product-ram">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {ramOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-product-condition">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {conditionOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-product"
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
