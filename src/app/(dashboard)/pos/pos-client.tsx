"use client";

import { useState } from "react";
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

type CartVariant = {
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
  variant: CartVariant;
  quantity: number;
  unitPrice: number;
};

export function POSClient({
  exchangeRate,
  locations,
  customers,
}: {
  exchangeRate: number;
  locations: Location[];
  customers: Customer[];
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

  const handleBarcodeScan = async (barcode: string) => {
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

  const addToCart = (variant: CartVariant) => {
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
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

      {/* Left: Scanner and Cart */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* Scanner */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <BarcodeScanner
                  onScan={handleBarcodeScan}
                  placeholder="Scan item barcode..."
                  autoFocus
                />
              </div>
              {locations.length > 1 && (
                <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {scannerLoading && (
              <p className="text-sm text-muted-foreground mt-2">Looking up...</p>
            )}
          </CardContent>
        </Card>

        {/* Cart Items */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({totalItems} items)
              </CardTitle>
              {cartItems.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="overflow-auto" style={{ maxHeight: "calc(100vh - 22rem)" }}>
            {cartItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ScanBarcode className="h-16 w-16 mx-auto mb-3 opacity-30" />
                <p className="text-lg">Cart is empty</p>
                <p className="text-sm">Scan items to add them</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-[120px]">Qty</TableHead>
                    <TableHead className="w-[100px]">Price</TableHead>
                    <TableHead className="text-right w-[100px]">Total</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartItems.map((item) => (
                    <TableRow key={item.variant.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.variant.product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.variant.product.brand.name} • {item.variant.specification.label}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.variant.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">
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
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updatePrice(item.variant.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-20 h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatUsd(item.unitPrice * item.quantity)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeItem(item.variant.id)}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Summary and Actions */}
      <div className="flex flex-col gap-4">
        {/* Customer Selection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedCustomerId || "walk-in"}
              onValueChange={(v) => setSelectedCustomerId(v === "walk-in" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Walk-in Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.companyName && ` (${customer.companyName})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Order Summary</CardTitle>
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
                className="w-16 h-8 text-sm text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
              <span className="ml-auto text-sm text-red-600">
                -{formatUsd(discountAmount)}
              </span>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <div className="text-right">
                <p className="text-2xl font-bold">{formatUsd(total)}</p>
                <p className="text-sm text-muted-foreground">
                  SRD {totalSrd.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checkout Button */}
        <Button
          onClick={handleCheckout}
          disabled={cartItems.length === 0}
          className="h-16 text-xl"
          size="lg"
        >
          <CreditCard className="h-6 w-6 mr-2" />
          Checkout
        </Button>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={() => setDiscountPercent(5)}
            className="text-xs"
          >
            5% Off
          </Button>
          <Button
            variant="outline"
            onClick={() => setDiscountPercent(10)}
            className="text-xs"
          >
            10% Off
          </Button>
          <Button
            variant="outline"
            onClick={() => setDiscountPercent(15)}
            className="text-xs"
          >
            15% Off
          </Button>
        </div>
      </div>
    </div>
  );
}
