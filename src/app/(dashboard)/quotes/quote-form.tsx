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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, ScanBarcode } from "lucide-react";
import { formatUsd, formatSrd, convertUsdToSrd } from "@/lib/currency";
import { BarcodeScanner } from "@/components/shared/barcode-scanner";

type Customer = {
  id: string;
  name: string;
  companyName: string | null;
};

type Variant = {
  id: string;
  priceUsd: number;
  barcode: string | null;
  stockQuantity: number;
  product: {
    id: string;
    name: string;
    brand: { name: string };
  };
  literVariation: {
    label: string;
  };
};

type LineItem = {
  variantId: string;
  variant: Variant;
  quantity: number;
  unitPriceUsd: number;
};

export function QuoteForm({
  customers,
  variants,
  exchangeRate,
  existingQuote,
}: {
  customers: Customer[];
  variants: Variant[];
  exchangeRate: number;
  existingQuote?: {
    id: string;
    customerId: string;
    notes: string | null;
    validUntil: string | null;
    items: Array<{
      variantId: string;
      quantity: number;
      unitPriceUsd: number;
      variant: Variant;
    }>;
  };
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [customerId, setCustomerId] = useState(existingQuote?.customerId || "");
  const [notes, setNotes] = useState(existingQuote?.notes || "");
  const [validUntil, setValidUntil] = useState(
    existingQuote?.validUntil
      ? new Date(existingQuote.validUntil).toISOString().split("T")[0]
      : ""
  );
  const [items, setItems] = useState<LineItem[]>(
    existingQuote?.items.map((item) => ({
      variantId: item.variantId,
      variant: item.variant,
      quantity: item.quantity,
      unitPriceUsd: item.unitPriceUsd,
    })) || []
  );
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [scannerLoading, setScannerLoading] = useState(false);

  const availableVariants = variants.filter(
    (v) => !items.some((item) => item.variantId === v.id)
  );

  const addItem = () => {
    const variant = variants.find((v) => v.id === selectedVariantId);
    if (!variant) return;

    setItems([
      ...items,
      {
        variantId: variant.id,
        variant,
        quantity: 1,
        unitPriceUsd: variant.priceUsd,
      },
    ]);
    setSelectedVariantId("");
  };

  // Handle barcode scan to add items
  const handleBarcodeScan = async (barcode: string) => {
    setScannerLoading(true);
    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(barcode)}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Product not found");
        return;
      }

      // Check if already in items
      const existingIndex = items.findIndex((item) => item.variantId === data.id);
      if (existingIndex !== -1) {
        // Increment quantity
        const newItems = [...items];
        newItems[existingIndex].quantity += 1;
        setItems(newItems);
        toast.success(`Added another ${data.product.name} (Qty: ${newItems[existingIndex].quantity})`);
        return;
      }

      // Find the variant in our list
      const variant = variants.find((v) => v.id === data.id);
      if (!variant) {
        toast.error("Product not available for quoting");
        return;
      }

      // Add new item
      setItems([
        ...items,
        {
          variantId: variant.id,
          variant,
          quantity: 1,
          unitPriceUsd: variant.priceUsd,
        },
      ]);
      toast.success(`Added: ${data.product.brand.name} - ${data.product.name}`);
    } catch {
      toast.error("Failed to lookup barcode");
    } finally {
      setScannerLoading(false);
    }
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(1, quantity);
    setItems(newItems);
  };

  const updateItemPrice = (index: number, price: number) => {
    const newItems = [...items];
    newItems[index].unitPriceUsd = Math.max(0, price);
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceUsd,
    0
  );

  const handleSubmit = async () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    setIsLoading(true);
    try {
      const url = existingQuote
        ? `/api/quotes/${existingQuote.id}`
        : "/api/quotes";
      const method = existingQuote ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          notes,
          validUntil: validUntil || null,
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitPriceUsd: item.unitPriceUsd,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save quote");
      }

      const quote = await res.json();
      toast.success(existingQuote ? "Quote updated" : "Quote created");
      router.push(`/quotes/${quote.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save quote"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer & Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                        {customer.companyName && ` (${customer.companyName})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for this quote"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5" />
              Line Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Barcode Scanner */}
            <div className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Scan barcode to add items
              </p>
              <BarcodeScanner
                onScan={handleBarcodeScan}
                placeholder="Scan product barcode..."
                autoFocus={false}
              />
              {scannerLoading && (
                <p className="mt-2 text-sm text-blue-600">Looking up product...</p>
              )}
            </div>

            {/* Manual Selection */}
            {variants.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground border rounded-md">
                <p>No product variants available.</p>
                <p className="text-sm mt-1">
                  Go to Products → click a product → Add Variant to create variants.
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={selectedVariantId}
                  onValueChange={setSelectedVariantId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Or select a product manually" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {availableVariants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.product.brand.name} - {variant.product.name} ({variant.literVariation.label}) - {formatUsd(variant.priceUsd)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={addItem}
                  disabled={!selectedVariantId}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {items.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-[100px]">Qty</TableHead>
                    <TableHead className="w-[120px]">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.variantId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {item.variant.product.brand.name} -{" "}
                            {item.variant.product.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.variant.literVariation.label}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemQuantity(index, parseInt(e.target.value) || 1)
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPriceUsd}
                          onChange={(e) =>
                            updateItemPrice(index, parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatUsd(item.quantity * item.unitPriceUsd)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {items.length === 0 && (
              <p className="text-center py-4 text-muted-foreground">
                No items added yet. Scan a barcode or select from the dropdown.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal (USD)</span>
                <span className="font-medium">{formatUsd(subtotal)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total (USD)</span>
                <span>{formatUsd(subtotal)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-blue-600">
                <span>Total (SRD)</span>
                <span>{formatSrd(convertUsdToSrd(subtotal, exchangeRate))}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Rate: $1 = {formatSrd(exchangeRate)}
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isLoading || items.length === 0}
              className="w-full"
            >
              {isLoading
                ? "Saving..."
                : existingQuote
                ? "Update Quote"
                : "Create Quote"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
