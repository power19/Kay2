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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ScanBarcode,
  Plus,
  Minus,
  Trash2,
  Package,
  Warehouse,
  Store,
  Check,
  X,
} from "lucide-react";
import { formatUsd } from "@/lib/currency";
import { BarcodeScanner } from "@/components/shared/barcode-scanner";

type Variant = {
  id: string;
  costPriceUsd: number;
  priceUsd: number;
  sku: string | null;
  barcode: string | null;
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

type Location = {
  id: string;
  name: string;
  type: string;
};

type ScannedItem = {
  variant: Variant;
  quantity: number;
  locationId: string;
};

export function ReceivingClient({
  variants,
  locations,
}: {
  variants: Variant[];
  locations: Location[];
}) {
  const router = useRouter();
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [defaultLocationId, setDefaultLocationId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");

  // Get default storage location
  const storageLocations = locations.filter((l) => l.type === "storage");
  const displayLocations = locations.filter((l) => l.type === "display");

  const handleBarcodeScan = async (barcode: string) => {
    setScannerLoading(true);
    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(barcode)}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Product not found");
        return;
      }

      addItemToList(data);
    } catch {
      toast.error("Failed to lookup barcode");
    } finally {
      setScannerLoading(false);
    }
  };

  const addItemToList = (variant: Variant) => {
    setScannedItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.variant.id === variant.id);

      if (existingIndex >= 0) {
        // Increment quantity if already in list
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        toast.success(`+1 ${variant.product.brand.name} - ${variant.product.name} (${updated[existingIndex].quantity} total)`);
        return updated;
      } else {
        // Add new item
        toast.success(`Added: ${variant.product.brand.name} - ${variant.product.name}`);
        return [
          ...prev,
          {
            variant,
            quantity: 1,
            locationId: defaultLocationId,
          },
        ];
      }
    });
  };

  const addManualItem = () => {
    if (!selectedVariantId) return;
    const variant = variants.find((v) => v.id === selectedVariantId);
    if (variant) {
      addItemToList(variant);
      setSelectedVariantId("");
    }
  };

  const updateItemQuantity = (variantId: string, delta: number) => {
    setScannedItems((prev) =>
      prev
        .map((item) =>
          item.variant.id === variantId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const setItemQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variantId);
      return;
    }
    setScannedItems((prev) =>
      prev.map((item) =>
        item.variant.id === variantId ? { ...item, quantity } : item
      )
    );
  };

  const updateItemLocation = (variantId: string, locationId: string) => {
    setScannedItems((prev) =>
      prev.map((item) =>
        item.variant.id === variantId ? { ...item, locationId } : item
      )
    );
  };

  const removeItem = (variantId: string) => {
    setScannedItems((prev) => prev.filter((item) => item.variant.id !== variantId));
  };

  const clearAll = () => {
    setScannedItems([]);
    setReference("");
    setNotes("");
  };

  const applyLocationToAll = (locationId: string) => {
    setScannedItems((prev) =>
      prev.map((item) => ({ ...item, locationId }))
    );
    toast.success("Applied location to all items");
  };

  const handleSubmit = async () => {
    if (scannedItems.length === 0) {
      toast.error("No items to receive");
      return;
    }

    // Check for items without locations
    const itemsWithoutLocation = scannedItems.filter((item) => !item.locationId);
    if (itemsWithoutLocation.length > 0) {
      toast.error(`${itemsWithoutLocation.length} item(s) need a location assigned`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/receiving", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: scannedItems.map((item) => ({
            variantId: item.variant.id,
            quantity: item.quantity,
            locationId: item.locationId,
          })),
          reference,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to receive goods");
      }

      const data = await res.json();
      toast.success(`Successfully received ${data.totalItems} items`);
      clearAll();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to receive goods");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate totals
  const totalItems = scannedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCostValue = scannedItems.reduce(
    (sum, item) => sum + item.variant.costPriceUsd * item.quantity,
    0
  );

  // Available variants (not already in list)
  const availableVariants = variants.filter(
    (v) => !scannedItems.some((item) => item.variant.id === v.id)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Scanner and Item List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Scanner Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ScanBarcode className="h-5 w-5" />
              Scan Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BarcodeScanner
              onScan={handleBarcodeScan}
              placeholder="Scan barcode to add item..."
            />
            {scannerLoading && (
              <p className="text-sm text-muted-foreground">Looking up...</p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm text-muted-foreground">Or add manually:</span>
              <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {availableVariants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.product.brand.name} - {variant.product.name} ({variant.specification.label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addManualItem} disabled={!selectedVariantId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Default location for new scans */}
            <div className="flex items-center gap-2 border-t pt-4">
              <Label className="text-sm whitespace-nowrap">Default location for new items:</Label>
              <Select value={defaultLocationId || "none"} onValueChange={(v) => setDefaultLocationId(v === "none" ? "" : v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select default location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No default</SelectItem>
                  {storageLocations.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Storage</div>
                      {storageLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          <span className="flex items-center gap-2">
                            <Warehouse className="h-3 w-3" /> {loc.name}
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {displayLocations.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Display</div>
                      {displayLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          <span className="flex items-center gap-2">
                            <Store className="h-3 w-3" /> {loc.name}
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Scanned Items List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Scanned Items ({scannedItems.length})
              </CardTitle>
              {scannedItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select onValueChange={applyLocationToAll}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Apply location to all" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name} ({loc.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {scannedItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ScanBarcode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No items scanned yet</p>
                <p className="text-sm">Start scanning barcodes to add items</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-[140px]">Quantity</TableHead>
                    <TableHead className="w-[200px]">Location</TableHead>
                    <TableHead className="text-right w-[100px]">Cost</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scannedItems.map((item) => (
                    <TableRow key={item.variant.id}>
                      <TableCell>
                        <div>
                          <Badge variant="outline" className="mb-1">
                            {item.variant.product.brand.name}
                          </Badge>
                          <p className="font-medium">{item.variant.product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.variant.specification.label}
                            {item.variant.barcode && (
                              <span className="ml-2 font-mono text-xs">
                                {item.variant.barcode}
                              </span>
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item.variant.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              setItemQuantity(item.variant.id, parseInt(e.target.value) || 0)
                            }
                            className="w-16 text-center"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item.variant.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.locationId}
                          onValueChange={(value) => updateItemLocation(item.variant.id, value)}
                        >
                          <SelectTrigger className={!item.locationId ? "border-orange-500" : ""}>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                <span className="flex items-center gap-2">
                                  {loc.type === "storage" ? (
                                    <Warehouse className="h-3 w-3" />
                                  ) : (
                                    <Store className="h-3 w-3" />
                                  )}
                                  {loc.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatUsd(item.variant.costPriceUsd * item.quantity)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
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

      {/* Right Column - Summary and Submit */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Receiving Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unique Products</span>
                <span className="font-medium">{scannedItems.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Items</span>
                <span className="font-medium">{totalItems}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Total Cost Value</span>
                <span className="font-bold">{formatUsd(totalCostValue)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="reference">Reference (e.g., PO Number)</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="PO-12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={scannedItems.length === 0 || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                "Processing..."
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Receive {totalItems} Items
                </>
              )}
            </Button>

            {scannedItems.some((item) => !item.locationId) && (
              <p className="text-sm text-orange-600 text-center">
                Some items need a location assigned
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        {scannedItems.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Location Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {locations.map((loc) => {
                  const count = scannedItems
                    .filter((item) => item.locationId === loc.id)
                    .reduce((sum, item) => sum + item.quantity, 0);
                  if (count === 0) return null;
                  return (
                    <div key={loc.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {loc.type === "storage" ? (
                          <Warehouse className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Store className="h-4 w-4 text-green-600" />
                        )}
                        {loc.name}
                      </span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  );
                })}
                {scannedItems.some((item) => !item.locationId) && (
                  <div className="flex items-center justify-between text-sm text-orange-600">
                    <span>Unassigned</span>
                    <Badge variant="outline" className="border-orange-500">
                      {scannedItems
                        .filter((item) => !item.locationId)
                        .reduce((sum, item) => sum + item.quantity, 0)}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
