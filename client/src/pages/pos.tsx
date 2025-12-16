import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Wallet, 
  ArrowRightLeft,
  User,
  X,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/currency-input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency, generateSaleNumber } from "@/lib/utils";
import type { ItemWithProduct, Customer, CashRegisterSession } from "@shared/schema";

interface CartItem {
  item: ItemWithProduct;
  salePrice: number;
}

export default function POS() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const { toast } = useToast();

  const { data: items = [], isLoading: itemsLoading } = useQuery<ItemWithProduct[]>({
    queryKey: ["/api/items"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: activeSession } = useQuery<CashRegisterSession | null>({
    queryKey: ["/api/cash-register/active"],
  });

  const availableItems = items.filter(item => 
    item.status === "available" && 
    !cart.some(c => c.item.id === item.id) &&
    (search === "" || 
      item.imei.toLowerCase().includes(search.toLowerCase()) ||
      item.product?.name.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (item: ItemWithProduct) => {
    const suggestedPrice = Math.round(item.purchasePrice * 1.2);
    setCart([...cart, { item, salePrice: suggestedPrice }]);
    setSearch("");
    toast({ title: `Added ${item.product?.name || "Item"} to cart` });
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.item.id !== itemId));
  };

  const updatePrice = (itemId: string, price: number) => {
    setCart(cart.map(c => 
      c.item.id === itemId ? { ...c, salePrice: price } : c
    ));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.salePrice, 0);
  const total = subtotal - discount;
  const profit = cart.reduce((sum, c) => sum + (c.salePrice - c.item.purchasePrice), 0) - discount;

  const createSaleMutation = useMutation({
    mutationFn: async () => {
      const paymentType = paidAmount >= total ? "full" : paidAmount > 0 ? "partial" : "credit";
      
      return apiRequest("POST", "/api/sales", {
        saleNumber: generateSaleNumber(),
        customerId: customerId || null,
        subtotal,
        discountAmount: discount,
        totalAmount: total,
        paidAmount,
        balanceImpact: total - paidAmount,
        profit,
        paymentType,
        paymentMethod,
        cashRegisterSessionId: activeSession?.id || null,
        items: cart.map(c => ({
          itemId: c.item.id,
          productId: c.item.productId,
          imei: c.item.imei,
          purchasePrice: c.item.purchasePrice,
          unitPrice: c.salePrice,
          totalPrice: c.salePrice,
          profit: c.salePrice - c.item.purchasePrice,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setCart([]);
      setCustomerId("");
      setDiscount(0);
      setPaidAmount(0);
      setIsCheckoutOpen(false);
      toast({ title: "Sale completed successfully!" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to complete sale", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    setPaidAmount(total);
    setIsCheckoutOpen(true);
  };

  const handleCompleteSale = () => {
    if (paidAmount < total && !customerId) {
      toast({ 
        title: "Customer required for credit sales", 
        description: "Please select a customer to track the outstanding balance.",
        variant: "destructive" 
      });
      return;
    }
    createSaleMutation.mutate();
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      <div className="flex-1 flex flex-col">
        <PageHeader 
          title="Point of Sale" 
          description="Scan IMEI or search for items"
          className="mb-4"
        />

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Scan IMEI or search product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 text-lg"
            data-testid="input-pos-search"
            autoFocus
          />
        </div>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pr-4">
            {itemsLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2 mb-3" />
                    <div className="h-6 bg-muted rounded w-1/3" />
                  </CardContent>
                </Card>
              ))
            ) : availableItems.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {search ? "No items match your search" : "No available items"}
              </div>
            ) : (
              availableItems.slice(0, 20).map((item) => (
                <Card 
                  key={item.id}
                  className="cursor-pointer hover-elevate active-elevate-2 transition-all"
                  onClick={() => addToCart(item)}
                  data-testid={`card-item-${item.id}`}
                >
                  <CardContent className="p-4">
                    <p className="font-medium text-sm truncate">{item.product?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{item.imei}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-medium">
                        {formatCurrency(item.purchasePrice)}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        <Plus className="h-3 w-3" />
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Card className="w-96 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart
            </CardTitle>
            <Badge variant="secondary">{cart.length} item{cart.length !== 1 ? "s" : ""}</Badge>
          </div>

          <Select value={customerId || "walk-in"} onValueChange={(val) => setCustomerId(val === "walk-in" ? "" : val)}>
            <SelectTrigger className="mt-2" data-testid="select-pos-customer">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Walk-in Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk-in">Walk-in Customer</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>

        <ScrollArea className="flex-1 px-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs">Scan or click items to add</p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {cart.map((cartItem) => (
                <div 
                  key={cartItem.item.id} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  data-testid={`cart-item-${cartItem.item.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {cartItem.item.product?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {cartItem.item.imei}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cost: {formatCurrency(cartItem.item.purchasePrice)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFromCart(cartItem.item.id)}
                      data-testid={`button-remove-${cartItem.item.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="w-24">
                      <CurrencyInput
                        value={cartItem.salePrice}
                        onChange={(price) => updatePrice(cartItem.item.id, price)}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      cartItem.salePrice > cartItem.item.purchasePrice 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-red-600 dark:text-red-400"
                    }`}>
                      {cartItem.salePrice > cartItem.item.purchasePrice ? "+" : ""}
                      {formatCurrency(cartItem.salePrice - cartItem.item.purchasePrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <CardFooter className="flex-col gap-4 border-t pt-4">
          <div className="w-full space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Discount</span>
              <div className="w-24">
                <CurrencyInput value={discount} onChange={setDiscount} />
              </div>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="font-mono">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
              <span>Profit</span>
              <span className="font-mono font-medium">+{formatCurrency(profit)}</span>
            </div>
          </div>

          <Button 
            className="w-full h-12 text-lg" 
            disabled={cart.length === 0}
            onClick={handleCheckout}
            data-testid="button-checkout"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Checkout
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
            <DialogDescription>
              Total: {formatCurrency(total)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "cash", label: "Cash", icon: Wallet },
                  { value: "card", label: "Card", icon: CreditCard },
                  { value: "transfer", label: "Transfer", icon: ArrowRightLeft },
                ].map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant={paymentMethod === value ? "default" : "outline"}
                    className="flex-col h-16 gap-1"
                    onClick={() => setPaymentMethod(value as typeof paymentMethod)}
                    data-testid={`button-payment-${value}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Amount Paid</label>
              <CurrencyInput value={paidAmount} onChange={setPaidAmount} />
              {paidAmount < total && (
                <p className="text-xs text-amber-600 mt-1">
                  Balance: {formatCurrency(total - paidAmount)} will be added to customer account
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {[total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setPaidAmount(amount)}
                  data-testid={`button-amount-${amount}`}
                >
                  {formatCurrency(amount)}
                </Button>
              ))}
            </div>

            {paidAmount > total && (
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <p className="text-sm font-medium">Change Due</p>
                <p className="text-2xl font-bold font-mono">{formatCurrency(paidAmount - total)}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCompleteSale}
              disabled={createSaleMutation.isPending}
              data-testid="button-complete-sale"
            >
              {createSaleMutation.isPending ? (
                "Processing..."
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Complete Sale
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
