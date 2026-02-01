"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ScanBarcode,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Receipt,
  X,
  User,
  Check,
  Search,
  Package,
} from "lucide-react";
import { formatUsd } from "@/lib/currency";
import { BarcodeScanner } from "@/components/shared/barcode-scanner";

type Location = {
  id: string;
  name: string;
  type: string;
};

type Customer = {
  id: string;
  name: string;
  companyName: string | null;
};

type ProductVariant = {
  id: string;
  barcode: string | null;
  sku: string | null;
  costPriceUsd: number;
  priceUsd: number;
  stockQuantity: number;
  product: {
    id: string;
    name: string;
    brand: {
      id: string;
      name: string;
    };
  };
  specification: {
    id: string;
    label: string;
    value: string;
  };
};

type CartItem = {
  variant: ProductVariant;
  quantity: number;
  unitPrice: number;
};

export function POSClient({
  exchangeRate,
  locations,
  customers,
  products,
}: {
  exchangeRate: number;
  locations: Location[];
  customers: Customer[];
  products: ProductVariant[];
}) {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || "");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [amountReceived, setAmountReceived] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.product.name.toLowerCase().includes(query) ||
        p.product.brand.name.toLowerCase().includes(query) ||
        p.specification.label.toLowerCase().includes(query) ||
        p.barcode?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleBarcodeScan = async (barcode: string) => {
    // First try to find in local products
    const localProduct = products.find(
      (p) => p.barcode === barcode || p.sku === barcode
    );
    if (localProduct) {
      addToCart(localProduct);
      return;
    }

    // Fall back to API lookup
    setScannerLoading(true);
    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(barcode)}`);
      const data = await res.json();

      if (data.found === false) {
        toast.error(`Product not found: ${barcode}`);
        return;
      }

      if (!res.ok) {
        toast.error(data.error || "Failed to lookup barcode");
        return;
      }

      addToCart(data);
    } catch {
      toast.error("Failed to lookup barcode");
    } finally {
      setScannerLoading(false);
    }
  };

  const addToCart = (variant: ProductVariant) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.variant.id === variant.id);

      if (existingIndex >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + 1;

        if (newQty > variant.stockQuantity) {
          toast.error(`Only ${variant.stockQuantity} in stock`);
          return prev;
        }

        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
        };
        toast.success(`${variant.product.name} (${updated[existingIndex].quantity})`);
        return updated;
      } else {
        if (variant.stockQuantity < 1) {
          toast.error("Out of stock");
          return prev;
        }
        toast.success(`Added: ${variant.product.brand.name} - ${variant.product.name}`);
        return [
          ...prev,
          {
            variant,
            quantity: 1,
            unitPrice: variant.priceUsd,
          },
        ];
      }
    });
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setCartItems((prev) => {
      const item = prev.find((i) => i.variant.id === variantId);
      if (!item) return prev;

      const newQty = item.quantity + delta;

      if (newQty <= 0) {
        return prev.filter((i) => i.variant.id !== variantId);
      }

      if (newQty > item.variant.stockQuantity) {
        toast.error(`Only ${item.variant.stockQuantity} in stock`);
        return prev;
      }

      return prev.map((i) =>
        i.variant.id === variantId ? { ...i, quantity: newQty } : i
      );
    });
  };

  const updatePrice = (variantId: string, newPrice: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.variant.id === variantId ? { ...item, unitPrice: newPrice } : item
      )
    );
  };

  const removeItem = (variantId: string) => {
    setCartItems((prev) => prev.filter((item) => item.variant.id !== variantId));
  };

  const clearCart = () => {
    setCartItems([]);
    setDiscountPercent(0);
    setSelectedCustomerId("");
  };

  // Calculations
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const discountAmount = subtotal * (discountPercent / 100);
  const total = subtotal - discountAmount;
  const totalSrd = total * exchangeRate;
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setAmountReceived(total.toFixed(2));
    setShowPaymentDialog(true);
  };

  const processSale = async () => {
    if (!selectedLocationId) {
      toast.error("Please select a location");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            variantId: item.variant.id,
            quantity: item.quantity,
            unitPriceUsd: item.unitPrice,
          })),
          locationId: selectedLocationId,
          customerId: selectedCustomerId || null,
          paymentMethod,
          discountPercent,
          subtotalUsd: subtotal,
          discountUsd: discountAmount,
          totalUsd: total,
          exchangeRate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process sale");
      }

      toast.success(`Sale completed! Invoice: ${data.invoiceNumber}`);
      setShowPaymentDialog(false);
      clearCart();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process sale");
    } finally {
      setIsProcessing(false);
    }
  };

  const change = parseFloat(amountReceived) - total;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-4xl font-bold">{formatUsd(total)}</p>
              <p className="text-lg text-muted-foreground">
                SRD {totalSrd.toFixed(2)}
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("cash")}
                  className="flex-col h-16"
                >
                  <Banknote className="h-5 w-5 mb-1" />
                  Cash
                </Button>
                <Button
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("card")}
                  className="flex-col h-16"
                >
                  <CreditCard className="h-5 w-5 mb-1" />
                  Card
                </Button>
                <Button
                  variant={paymentMethod === "transfer" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("transfer")}
                  className="flex-col h-16"
                >
                  <Receipt className="h-5 w-5 mb-1" />
                  Transfer
                </Button>
              </div>
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-2">
                <Label>Amount Received (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="text-2xl h-14 text-center"
                />
                {change >= 0 && (
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Change</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatUsd(change)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={processSale}
              disabled={isProcessing || (paymentMethod === "cash" && change < 0)}
              className="w-full h-14 text-lg"
            >
              {isProcessing ? (
                "Processing..."
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Complete Sale
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Left: Products Grid */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Search and Scanner */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5 text-muted-foreground" />
              <BarcodeScanner
                onScan={handleBarcodeScan}
                placeholder="Scan barcode..."
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {scannerLoading && (
              <p className="text-sm text-muted-foreground">Looking up...</p>
            )}
          </CardContent>
        </Card>

        {/* Products Grid */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Products ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto" style={{ maxHeight: "calc(100vh - 18rem)" }}>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredProducts.map((product) => {
                  const inCart = cartItems.find((i) => i.variant.id === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="p-3 text-left border rounded-lg hover:bg-accent hover:border-primary transition-colors relative"
                    >
                      {inCart && (
                        <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                          {inCart.quantity}
                        </Badge>
                      )}
                      <p className="font-medium text-sm truncate">{product.product.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {product.product.brand.name} • {product.specification.label}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-sm">{formatUsd(product.priceUsd)}</span>
                        <span className="text-xs text-muted-foreground">
                          Stock: {product.stockQuantity}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Middle: Cart */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({totalItems})
              </CardTitle>
              {cartItems.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="overflow-auto" style={{ maxHeight: "calc(100vh - 14rem)" }}>
            {cartItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div
                    key={item.variant.id}
                    className="p-2 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.variant.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.variant.specification.label}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeItem(item.variant.id)}
                      >
                        <X className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.variant.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium text-sm">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.variant.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updatePrice(item.variant.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-20 h-7 text-xs text-right"
                        />
                        <p className="text-xs font-medium mt-1">
                          {formatUsd(item.unitPrice * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Summary */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        {/* Location */}
        {locations.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Customer */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedCustomerId || "walk-in"}
              onValueChange={(v) => setSelectedCustomerId(v === "walk-in" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Walk-in" />
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
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatUsd(subtotal)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Discount</span>
              <Input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.min(100, parseFloat(e.target.value) || 0))}
                className="w-14 h-7 text-xs text-center"
              />
              <span className="text-xs">%</span>
              <span className="ml-auto text-sm text-red-600">
                -{formatUsd(discountAmount)}
              </span>
            </div>

            <Separator />

            <div className="text-right">
              <p className="text-3xl font-bold">{formatUsd(total)}</p>
              <p className="text-sm text-muted-foreground">
                SRD {totalSrd.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Discounts */}
        <div className="grid grid-cols-3 gap-1">
          <Button variant="outline" size="sm" onClick={() => setDiscountPercent(5)}>
            5%
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDiscountPercent(10)}>
            10%
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDiscountPercent(15)}>
            15%
          </Button>
        </div>

        {/* Checkout */}
        <Button
          onClick={handleCheckout}
          disabled={cartItems.length === 0}
          className="h-14 text-lg"
          size="lg"
        >
          <CreditCard className="h-5 w-5 mr-2" />
          Checkout
        </Button>
      </div>
    </div>
  );
}
