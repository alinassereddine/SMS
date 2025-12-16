import { useState } from "react";
import { Settings, Shield, Bell, Database, Palette, Coins, Plus, MoreHorizontal, Star, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/lib/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertCurrencySchema, type Currency, type InsertCurrency } from "@shared/schema";
import { z } from "zod";

const currencyFormSchema = insertCurrencySchema.extend({
  exchangeRate: z.number().int().min(1, "Exchange rate must be a positive integer"),
  decimals: z.number().min(0).max(4).default(2),
});

type CurrencyFormValues = z.infer<typeof currencyFormSchema>;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [businessName, setBusinessName] = useState("SMS Store");
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);

  const { data: currencies = [] } = useQuery<Currency[]>({
    queryKey: ["/api/currencies"],
  });

  const form = useForm<CurrencyFormValues>({
    resolver: zodResolver(currencyFormSchema),
    defaultValues: {
      code: "",
      name: "",
      symbol: "",
      exchangeRate: 10000,
      decimals: 2,
      isDefault: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertCurrency) => apiRequest("POST", "/api/currencies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currencies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/currencies/default"] });
      setCurrencyDialogOpen(false);
      form.reset();
      toast({ title: "Currency added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add currency", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertCurrency> }) =>
      apiRequest("PATCH", `/api/currencies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currencies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/currencies/default"] });
      setCurrencyDialogOpen(false);
      setEditingCurrency(null);
      form.reset();
      toast({ title: "Currency updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update currency", variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/currencies/${id}/set-default`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currencies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/currencies/default"] });
      toast({ title: "Default currency updated" });
    },
    onError: () => {
      toast({ title: "Failed to set default currency", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/currencies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currencies"] });
      toast({ title: "Currency deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete currency", variant: "destructive" });
    },
  });

  const handleSave = () => {
    toast({ title: "Settings saved successfully" });
  };

  const openCurrencyDialog = (currency?: Currency) => {
    if (currency) {
      setEditingCurrency(currency);
      form.reset({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        exchangeRate: currency.exchangeRate,
        decimals: currency.decimals ?? 2,
        isDefault: currency.isDefault ?? false,
      });
    } else {
      setEditingCurrency(null);
      form.reset({
        code: "",
        name: "",
        symbol: "",
        exchangeRate: 10000,
        decimals: 2,
        isDefault: false,
      });
    }
    setCurrencyDialogOpen(true);
  };

  const handleCurrencySubmit = (data: CurrencyFormValues) => {
    if (editingCurrency) {
      updateMutation.mutate({ id: editingCurrency.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings" 
        description="Manage your application preferences"
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="currency" className="gap-2">
            <Coins className="h-4 w-4" />
            Currency
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Information</CardTitle>
              <CardDescription>
                Configure your business details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input
                    id="business-name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your Business Name"
                    data-testid="input-business-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <p className="text-sm text-muted-foreground">
                    Manage currencies in the Currency tab
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main St, City, State"
                  data-testid="input-address"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+1 234 567 890"
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@business.com"
                    data-testid="input-email"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory Settings</CardTitle>
              <CardDescription>
                Configure inventory behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-generate IMEI</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically generate IMEI numbers for new items
                  </p>
                </div>
                <Switch data-testid="switch-auto-imei" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Low Stock Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when product stock is low
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-low-stock" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} data-testid="button-save-settings">
              Save Changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="currency" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base">Currencies</CardTitle>
                <CardDescription>
                  Manage currencies and exchange rates
                </CardDescription>
              </div>
              <Button onClick={() => openCurrencyDialog()} data-testid="button-add-currency">
                <Plus className="h-4 w-4 mr-2" />
                Add Currency
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currencies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No currencies configured. Add your first currency to get started.
                  </p>
                ) : (
                  currencies.map((curr) => (
                    <div
                      key={curr.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-md border"
                      data-testid={`currency-row-${curr.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                          <span className="text-sm font-medium">{curr.symbol}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{curr.name}</span>
                            <Badge variant="outline" className="text-xs">{curr.code}</Badge>
                            {curr.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Rate: {(curr.exchangeRate / 10000).toFixed(4)} | {curr.decimals} decimals
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`currency-menu-${curr.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openCurrencyDialog(curr)}>
                            Edit
                          </DropdownMenuItem>
                          {!curr.isDefault && (
                            <DropdownMenuItem onClick={() => setDefaultMutation.mutate(curr.id)}>
                              <Star className="h-4 w-4 mr-2" />
                              Set as Default
                            </DropdownMenuItem>
                          )}
                          {!curr.isDefault && (
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(curr.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme</CardTitle>
              <CardDescription>
                Customize the appearance of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === "light" ? "border-primary" : "border-border"
                  }`}
                  data-testid="button-theme-light"
                >
                  <div className="h-20 rounded-md bg-white border mb-2" />
                  <p className="text-sm font-medium">Light</p>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === "dark" ? "border-primary" : "border-border"
                  }`}
                  data-testid="button-theme-dark"
                >
                  <div className="h-20 rounded-md bg-gray-900 border border-gray-700 mb-2" />
                  <p className="text-sm font-medium">Dark</p>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === "system" ? "border-primary" : "border-border"
                  }`}
                  data-testid="button-theme-system"
                >
                  <div className="h-20 rounded-md bg-gradient-to-r from-white to-gray-900 border mb-2" />
                  <p className="text-sm font-medium">System</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>
                Control how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sale Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified for each new sale
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-sale-notif" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Payment Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Remind customers about pending payments
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-payment-notif" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Inventory Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Alert when inventory levels are low
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-inventory-notif" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Security Settings</CardTitle>
              <CardDescription>
                Manage your security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security
                  </p>
                </div>
                <Switch data-testid="switch-2fa" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Session Timeout</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically log out after inactivity
                  </p>
                </div>
                <Switch defaultChecked data-testid="switch-session-timeout" />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Change Password</Label>
                <div className="grid gap-2">
                  <Input type="password" placeholder="Current password" data-testid="input-current-password" />
                  <Input type="password" placeholder="New password" data-testid="input-new-password" />
                  <Input type="password" placeholder="Confirm new password" data-testid="input-confirm-password" />
                </div>
                <Button variant="outline" className="mt-2" data-testid="button-change-password">
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Management</CardTitle>
              <CardDescription>
                Manage your data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Export Data</p>
                  <p className="text-sm text-muted-foreground">
                    Download all your data as CSV or JSON
                  </p>
                </div>
                <Button variant="outline" data-testid="button-export-data">
                  <Database className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={currencyDialogOpen} onOpenChange={setCurrencyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCurrency ? "Edit Currency" : "Add Currency"}</DialogTitle>
            <DialogDescription>
              {editingCurrency 
                ? "Update the currency details below." 
                : "Enter the details for the new currency."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCurrencySubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="USD" 
                          {...field} 
                          maxLength={3}
                          data-testid="input-currency-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symbol</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="$" 
                          {...field} 
                          maxLength={5}
                          data-testid="input-currency-symbol"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="US Dollar" 
                        {...field}
                        data-testid="input-currency-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="exchangeRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange Rate</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="10000"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-currency-rate"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Rate relative to the default currency (scaled by 10000). Examples: 10000 = 1.0, 9200 = 0.92, 125 = 0.0125
                      </p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="decimals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decimal Places</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="2"
                          min={0}
                          max={4}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-currency-decimals"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCurrencyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-currency"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
