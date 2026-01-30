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

export function InvoiceForm({
  customers,
  variants,
  exchangeRate,
}: {
  customers: Customer[];
  variants: Variant[];
  exchangeRate: number;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("CASH/BANK");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [items, setItems] = useState<LineItem[]>([]);
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
        const maxQty = newItems[existingIndex].variant.stockQuantity;
        if (newItems[existingIndex].quantity < maxQty) {
          newItems[existingIndex].quantity += 1;
          setItems(newItems);
          toast.success(`Added another ${data.product.name} (Qty: ${newItems[existingIndex].quantity})`);
        } else {
          toast.error("Maximum stock reached for this item");
        }
        return;
      }

      // Find the variant in our list
      const variant = variants.find((v) => v.id === data.id);
      if (!variant) {
        toast.error("Product not available for invoicing");
        return;
      }

      if (variant.stockQuantity <= 0) {
        toast.error("Product is out of stock");
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
    const maxQty = newItems[index].variant.stockQuantity;
    newItems[index].quantity = Math.min(Math.max(1, quantity), maxQty);
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

  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount;

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
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          notes,
          dueDate: dueDate || null,
          paymentTerms,
          discountPercent,
          taxRate,
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitPriceUsd: item.unitPriceUsd,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create invoice");
      }

      const invoice = await res.json();
      toast.success("Invoice created");
      router.push(`/invoices/${invoice.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create invoice"
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
                <Label>Payment Terms</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="CASH/BANK">CASH/BANK</SelectItem>
                    <SelectItem value="CASH">CASH</SelectItem>
                    <SelectItem value="BANK">BANK</SelectItem>
                    <SelectItem value="NET 15">NET 15</SelectItem>
                    <SelectItem value="NET 30">NET 30</SelectItem>
                    <SelectItem value="NET 60">NET 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (appears on invoice)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. PAID IN CASH"
                />
              </div>
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
                        {variant.product.brand.name} - {variant.product.name} ({variant.literVariation.label}) - {formatUsd(variant.priceUsd)} (Stock: {variant.stockQuantity})
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
                            {item.variant.literVariation.label} (Stock: {item.variant.stockQuantity})
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          max={item.variant.stockQuantity}
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
            <CardTitle>Discount & Tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Discount (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>BTW / Tax (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>

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
              {discountPercent > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discountPercent}%)</span>
                  <span>-{formatUsd(discountAmount)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between">
                  <span>BTW ({taxRate}%)</span>
                  <span>{formatUsd(taxAmount)}</span>
                </div>
              )}
              <div className="border-t pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total (USD)</span>
                  <span>{formatUsd(total)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-blue-600">
                  <span>Total (SRD)</span>
                  <span>{formatSrd(convertUsdToSrd(total, exchangeRate))}</span>
                </div>
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
              {isLoading ? "Creating..." : "Create Invoice"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
