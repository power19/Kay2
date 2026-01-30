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
import { toast } from "sonner";
import {
  ScanBarcode,
  Plus,
  Minus,
  Check,
  X,
  Package,
  Camera,
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
  literVariation: {
    id: string;
    label: string;
    sizeInLiters: number;
  };
};

type ScanHistoryItem = {
  product: ScannedProduct;
  action: "add" | "remove";
  quantity: number;
  timestamp: Date;
};

export function ScanClient() {
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState("1");
  const [movementType, setMovementType] = useState("purchase");
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

    const quantityChange = adjustmentType === "add" ? qty : -qty;
    const newQuantity = scannedProduct.stockQuantity + quantityChange;

    if (newQuantity < 0) {
      toast.error("Stock cannot be negative");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/inventory/${scannedProduct.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityChange,
          type: movementType,
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
          action: adjustmentType,
          quantity: qty,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9), // Keep last 10 items
      ]);

      toast.success(
        `${adjustmentType === "add" ? "Added" : "Removed"} ${qty} units. New stock: ${updatedData.variant.stockQuantity}`
      );

      // Update scanned product with new stock
      setScannedProduct({
        ...scannedProduct,
        stockQuantity: updatedData.variant.stockQuantity,
      });

      // Reset for next scan
      setQuantity("1");
      setReference("");
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

  return (
    <div className="space-y-6">
      {/* Scanner Section */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Camera className="h-5 w-5" />
            Barcode Scanner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BarcodeScanner
            onScan={handleBarcodeScan}
            placeholder="Scan barcode or enter manually..."
            autoFocus={!scannedProduct}
          />
          {loading && (
            <p className="mt-2 text-sm text-blue-600">Looking up product...</p>
          )}
        </CardContent>
      </Card>

      {/* Scanned Product Info */}
      {scannedProduct && (
        <Card>
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
                <span>{scannedProduct.literVariation.label}</span>
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

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={adjustmentType === "add" ? "default" : "outline"}
                className="h-14"
                onClick={() => {
                  setAdjustmentType("add");
                  setMovementType("purchase");
                }}
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Stock
              </Button>
              <Button
                variant={adjustmentType === "remove" ? "destructive" : "outline"}
                className="h-14"
                onClick={() => {
                  setAdjustmentType("remove");
                  setMovementType("sale");
                }}
              >
                <Minus className="mr-2 h-5 w-5" />
                Remove Stock
              </Button>
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

            {/* Movement Type */}
            <div className="space-y-2">
              <Label htmlFor="movementType">Reason</Label>
              <Select value={movementType} onValueChange={setMovementType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {adjustmentType === "add" ? (
                    <>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference (Optional)</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g., PO-12345"
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleStockAdjustment}
              disabled={isProcessing}
              className="w-full h-12 text-lg"
              variant={adjustmentType === "add" ? "default" : "destructive"}
            >
              {isProcessing ? (
                "Processing..."
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  {adjustmentType === "add" ? "Add" : "Remove"} {quantity} Units
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scanHistory.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-2 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {item.product.product.name}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      ({item.product.literVariation.label})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.action === "add" ? "default" : "destructive"
                      }
                    >
                      {item.action === "add" ? "+" : "-"}
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
