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

type Location = {
  id: string;
  name: string;
  type: string;
};

type Brand = {
  id: string;
  name: string;
};

type Specification = {
  id: string;
  label: string;
  value: string;
};

type ScannedVariant = {
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

type ScannedItem = {
  variant: ScannedVariant;
  quantity: number;
  locationId: string;
};

export function ReceivingClient({
  locations,
  brands,
  specifications,
}: {
  locations: Location[];
  brands: Brand[];
  specifications: Specification[];
}) {
  const router = useRouter();
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [defaultLocationId, setDefaultLocationId] = useState("");

  // Create new product dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [createForm, setCreateForm] = useState({
    brandId: "",
    newBrandName: "",
    productName: "",
    specificationId: "",
    newSpecLabel: "",
    newSpecValue: "",
    costPriceUsd: "",
    priceUsd: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  const storageLocations = locations.filter((l) => l.type === "storage");
  const displayLocations = locations.filter((l) => l.type === "display");

  const handleBarcodeScan = async (barcode: string) => {
    setScannerLoading(true);
    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(barcode)}`);
      const data = await res.json();

      if (data.found === false) {
        // Product not found - show create dialog
        setScannedBarcode(barcode);
        setCreateForm({
          brandId: "",
          newBrandName: "",
          productName: "",
          specificationId: "",
          newSpecLabel: "",
          newSpecValue: "",
          costPriceUsd: "",
          priceUsd: "",
        });
        setShowCreateDialog(true);
        toast.info(`Barcode "${barcode}" not found. Create a new product.`);
        return;
      }

      if (!res.ok) {
        toast.error(data.error || "Failed to lookup barcode");
        return;
      }

      addItemToList(data);
    } catch {
      toast.error("Failed to lookup barcode");
    } finally {
      setScannerLoading(false);
    }
  };

  const addItemToList = (variant: ScannedVariant) => {
    setScannedItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.variant.id === variant.id);

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        toast.success(`+1 ${variant.product.brand.name} - ${variant.product.name} (${updated[existingIndex].quantity} total)`);
        return updated;
      } else {
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

  const handleCreateProduct = async () => {
    // Validation
    if (!createForm.brandId && !createForm.newBrandName.trim()) {
      toast.error("Brand is required");
      return;
    }
    if (!createForm.productName.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!createForm.specificationId && (!createForm.newSpecLabel.trim() || !createForm.newSpecValue.trim())) {
      toast.error("Specification is required");
      return;
    }
    const costPrice = parseFloat(createForm.costPriceUsd) || 0;
    const sellPrice = parseFloat(createForm.priceUsd);
    if (isNaN(sellPrice) || sellPrice < 0) {
      toast.error("Valid sell price is required");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/receiving/create-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: scannedBarcode,
          brandId: createForm.brandId || null,
          newBrandName: createForm.newBrandName.trim() || null,
          productName: createForm.productName.trim(),
          specificationId: createForm.specificationId || null,
          newSpecLabel: createForm.newSpecLabel.trim() || null,
          newSpecValue: createForm.newSpecValue.trim() || null,
          costPriceUsd: costPrice,
          priceUsd: sellPrice,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create product");
      }

      toast.success("Product created successfully");
      setShowCreateDialog(false);
      addItemToList(data.variant);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create product");
    } finally {
      setIsCreating(false);
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

  const totalItems = scannedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCostValue = scannedItems.reduce(
    (sum, item) => sum + item.variant.costPriceUsd * item.quantity,
    0
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Create Product Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-2 bg-muted rounded text-sm font-mono">
              Barcode: {scannedBarcode}
            </div>

            {/* Brand Selection */}
            <div className="space-y-2">
              <Label>Brand *</Label>
              <Select
                value={createForm.brandId}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, brandId: value, newBrandName: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select existing brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-center text-sm text-muted-foreground">or</div>
              <Input
                placeholder="Enter new brand name"
                value={createForm.newBrandName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, newBrandName: e.target.value, brandId: "" })
                }
              />
            </div>

            {/* Product Name */}
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                placeholder="e.g., iPhone 15 Pro"
                value={createForm.productName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, productName: e.target.value })
                }
              />
            </div>

            {/* Specification Selection */}
            <div className="space-y-2">
              <Label>Specification *</Label>
              <Select
                value={createForm.specificationId}
                onValueChange={(value) =>
                  setCreateForm({
                    ...createForm,
                    specificationId: value,
                    newSpecLabel: "",
                    newSpecValue: "",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select existing spec" />
                </SelectTrigger>
                <SelectContent>
                  {specifications.map((spec) => (
                    <SelectItem key={spec.id} value={spec.id}>
                      {spec.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-center text-sm text-muted-foreground">or create new</div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Label (e.g., 256GB)"
                  value={createForm.newSpecLabel}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      newSpecLabel: e.target.value,
                      specificationId: "",
                    })
                  }
                />
                <Input
                  placeholder="Value (e.g., 256GB)"
                  value={createForm.newSpecValue}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      newSpecValue: e.target.value,
                      specificationId: "",
                    })
                  }
                />
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost Price (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={createForm.costPriceUsd}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, costPriceUsd: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Sell Price (USD) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={createForm.priceUsd}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, priceUsd: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateProduct}
                disabled={isCreating}
                className="flex-1"
              >
                {isCreating ? "Creating..." : "Create & Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              placeholder="Scan barcode or SKU..."
            />
            {scannerLoading && (
              <p className="text-sm text-muted-foreground">Looking up...</p>
            )}

            {/* Default location for new scans */}
            <div className="flex items-center gap-2 border-t pt-4">
              <Label className="text-sm whitespace-nowrap">Default location:</Label>
              <Select
                value={defaultLocationId || "none"}
                onValueChange={(v) => setDefaultLocationId(v === "none" ? "" : v)}
              >
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
                    Clear
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
                <p className="text-sm">Scan barcodes to add items. New products will be created automatically.</p>
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

        {/* Location Breakdown */}
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
