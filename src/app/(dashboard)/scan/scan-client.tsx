"use client";

import { useState, useRef, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Minus,
  Check,
  X,
  Package,
  Camera,
  PackagePlus,
  PackageMinus,
  Truck,
  ShoppingCart,
} from "lucide-react";
import { BarcodeScanner } from "@/components/shared/barcode-scanner";
import { formatUsd } from "@/lib/currency";

type ScannedProduct = {
  id: string;
  barcode: string | null;
  sku: string | null;
  priceUsd: number;
  stockQuantity: number;
  lowStockThreshold: number;
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

type ScanHistoryItem = {
  product: ScannedProduct;
  action: "receive" | "sell";
  quantity: number;
  timestamp: Date;
};

export function ScanClient() {
  const [mode, setMode] = useState<"receive" | "sell">("receive");
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [reference, setReference] = useState("");
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Focus quantity input when product is scanned
  useEffect(() => {
    if (scannedProduct && quantityInputRef.current) {
      quantityInputRef.current.focus();
      quantityInputRef.current.select();
    }
  }, [scannedProduct]);

  const handleBarcodeScan = async (barcode: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/barcode?code=${encodeURIComponent(barcode)}`
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Product not found");
        setScannedProduct(null);
        return;
      }

      setScannedProduct(data);
      setQuantity("1");
      toast.success(
        `Found: ${data.product.brand.name} - ${data.product.name}`
      );
    } catch {
      toast.error("Failed to lookup barcode");
      setScannedProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!scannedProduct) return;

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be a positive number");
      return;
    }

    const quantityChange = mode === "receive" ? qty : -qty;
    const newQuantity = scannedProduct.stockQuantity + quantityChange;

    if (newQuantity < 0) {
      toast.error("Not enough stock available");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/inventory/${scannedProduct.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityChange,
          type: mode === "receive" ? "purchase" : "sale",
          reference: reference || null,
          notes: `Scanned: ${scannedProduct.barcode || scannedProduct.sku}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to adjust stock");
      }

      const updatedData = await res.json();

      // Add to history
      setScanHistory((prev) => [
        {
          product: scannedProduct,
          action: mode,
          quantity: qty,
          timestamp: new Date(),
        },
        ...prev.slice(0, 19), // Keep last 20 items
      ]);

      toast.success(
        `${mode === "receive" ? "Received" : "Sold"} ${qty} units. New stock: ${updatedData.variant.stockQuantity}`
      );

      // Update scanned product with new stock
      setScannedProduct({
        ...scannedProduct,
        stockQuantity: updatedData.variant.stockQuantity,
      });

      // Reset for next scan
      setQuantity("1");
      setReference("");

      // Clear product after short delay to allow next scan
      setTimeout(() => {
        setScannedProduct(null);
      }, 1500);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to adjust stock"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const clearScannedProduct = () => {
    setScannedProduct(null);
    setQuantity("1");
    setReference("");
  };

  const totalReceived = scanHistory
    .filter((h) => h.action === "receive")
    .reduce((sum, h) => sum + h.quantity, 0);

  const totalSold = scanHistory
    .filter((h) => h.action === "sell")
    .reduce((sum, h) => sum + h.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Mode Tabs */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as "receive" | "sell")}>
        <TabsList className="grid w-full grid-cols-2 h-14">
          <TabsTrigger
            value="receive"
            className="h-12 text-base data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            <Truck className="mr-2 h-5 w-5" />
            Receive Goods
          </TabsTrigger>
          <TabsTrigger
            value="sell"
            className="h-12 text-base data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Sell / Remove
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receive" className="mt-4">
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-900">
                <PackagePlus className="h-5 w-5" />
                Scan to Receive Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarcodeScanner
                onScan={handleBarcodeScan}
                placeholder="Scan barcode to add to inventory..."
                autoFocus={!scannedProduct && mode === "receive"}
              />
              {loading && (
                <p className="mt-2 text-sm text-green-600">Looking up product...</p>
              )}
              <p className="mt-2 text-sm text-green-700">
                Scan products as they arrive to add them to stock
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sell" className="mt-4">
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <PackageMinus className="h-5 w-5" />
                Scan to Sell / Remove Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarcodeScanner
                onScan={handleBarcodeScan}
                placeholder="Scan barcode to remove from inventory..."
                autoFocus={!scannedProduct && mode === "sell"}
              />
              {loading && (
                <p className="mt-2 text-sm text-blue-600">Looking up product...</p>
              )}
              <p className="mt-2 text-sm text-blue-700">
                Scan products when selling to deduct from stock
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scanned Product Info */}
      {scannedProduct && (
        <Card className={mode === "receive" ? "border-green-300" : "border-blue-300"}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Scanned Product
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={clearScannedProduct}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <Badge variant="outline" className="mb-2">
                {scannedProduct.product.brand.name}
              </Badge>
              <h3 className="text-lg font-semibold">
                {scannedProduct.product.name}
              </h3>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>{scannedProduct.specification.label}</span>
                <span>•</span>
                <span>{formatUsd(scannedProduct.priceUsd)}</span>
                {scannedProduct.barcode && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{scannedProduct.barcode}</span>
                  </>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Current Stock:
                </span>
                <span
                  className={`text-lg font-bold ${
                    scannedProduct.stockQuantity <=
                    scannedProduct.lowStockThreshold
                      ? "text-orange-600"
                      : "text-green-600"
                  }`}
                >
                  {scannedProduct.stockQuantity}
                </span>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setQuantity((q) => Math.max(1, parseInt(q) - 1).toString())
                  }
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  ref={quantityInputRef}
                  id="quantity"
                  type="number"
                  min="1"
                  max={mode === "sell" ? scannedProduct.stockQuantity : undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="text-center text-lg font-bold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setQuantity((q) => (parseInt(q) + 1).toString())
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">
                {mode === "receive" ? "PO / Delivery Reference" : "Sale Reference"} (Optional)
              </Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={mode === "receive" ? "e.g., PO-12345" : "e.g., CASH-001"}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleStockAdjustment}
              disabled={isProcessing}
              className="w-full h-14 text-lg"
              variant={mode === "receive" ? "default" : "destructive"}
            >
              {isProcessing ? (
                "Processing..."
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  {mode === "receive" ? "Receive" : "Sell"} {quantity} Units
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Session Summary */}
      {scanHistory.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-green-700">Total Received</p>
                <p className="text-3xl font-bold text-green-600">+{totalReceived}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-blue-700">Total Sold</p>
                <p className="text-3xl font-bold text-blue-600">-{totalSold}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Session History ({scanHistory.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {scanHistory.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between rounded-lg p-2 text-sm ${
                    item.action === "receive" ? "bg-green-50" : "bg-blue-50"
                  }`}
                >
                  <div>
                    <span className="font-medium">
                      {item.product.product.name}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      ({item.product.specification.label})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={item.action === "receive" ? "default" : "secondary"}
                      className={item.action === "receive" ? "bg-green-600" : "bg-blue-600 text-white"}
                    >
                      {item.action === "receive" ? "+" : "-"}
                      {item.quantity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
