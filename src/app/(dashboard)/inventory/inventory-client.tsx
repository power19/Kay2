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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Minus, AlertTriangle, ScanBarcode, TrendingUp, DollarSign, Package, ChevronDown, Warehouse, Store, ArrowRight } from "lucide-react";
import { formatUsd } from "@/lib/currency";
import { BarcodeScanner } from "@/components/shared/barcode-scanner";
import { Card, CardContent } from "@/components/ui/card";

type LocationStock = {
  id: string;
  quantity: number;
  location: {
    id: string;
    name: string;
    type: string;
  };
};

type Variant = {
  id: string;
  costPriceUsd: number;
  priceUsd: number;
  sku: string | null;
  barcode: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  createdAt: Date;
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
  locationStock: LocationStock[];
};

type Location = {
  id: string;
  name: string;
  type: string;
};

export function InventoryClient({
  inventory,
  exchangeRate,
  locations,
}: {
  inventory: Variant[];
  exchangeRate: number;
  locations: Location[];
}) {
  const router = useRouter();
  const [adjustingVariant, setAdjustingVariant] = useState<Variant | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove" | "transfer">("add");
  const [formData, setFormData] = useState({
    quantity: "",
    type: "adjustment",
    reference: "",
    notes: "",
    locationId: "",
    toLocationId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Handle barcode scan
  const handleBarcodeScan = async (barcode: string) => {
    setScannerLoading(true);
    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(barcode)}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Product not found");
        return;
      }

      const variant = inventory.find((v) => v.id === data.id);
      if (variant) {
        openAdjustDialog(variant, "add");
        toast.success(`Found: ${data.product.brand.name} - ${data.product.name}`);
      } else {
        toast.error("Product found but not in inventory view");
      }
    } catch {
      toast.error("Failed to lookup barcode");
    } finally {
      setScannerLoading(false);
    }
  };

  const filteredInventory = filterLowStock
    ? inventory.filter((v) => v.stockQuantity <= v.lowStockThreshold)
    : inventory;

  const lowStockCount = inventory.filter(
    (v) => v.stockQuantity <= v.lowStockThreshold
  ).length;

  // Calculate inventory stats
  const totalItems = inventory.reduce((sum, v) => sum + v.stockQuantity, 0);
  const totalCostValue = inventory.reduce((sum, v) => sum + (v.costPriceUsd * v.stockQuantity), 0);
  const totalSellValue = inventory.reduce((sum, v) => sum + (v.priceUsd * v.stockQuantity), 0);
  const totalPotentialProfit = totalSellValue - totalCostValue;

  // Calculate storage vs display totals
  const storageTotal = inventory.reduce((sum, v) => {
    return sum + v.locationStock
      .filter((ls) => ls.location.type === "storage")
      .reduce((s, ls) => s + ls.quantity, 0);
  }, 0);
  const displayTotal = inventory.reduce((sum, v) => {
    return sum + v.locationStock
      .filter((ls) => ls.location.type === "display")
      .reduce((s, ls) => s + ls.quantity, 0);
  }, 0);

  const resetForm = () => {
    setFormData({
      quantity: "",
      type: "adjustment",
      reference: "",
      notes: "",
      locationId: "",
      toLocationId: "",
    });
    setAdjustingVariant(null);
  };

  const handleAdjustment = async () => {
    if (!adjustingVariant) return;

    const qty = parseInt(formData.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be a positive number");
      return;
    }

    // For transfer, validate both locations are selected
    if (adjustmentType === "transfer") {
      if (!formData.locationId || !formData.toLocationId) {
        toast.error("Please select both source and destination locations");
        return;
      }
      if (formData.locationId === formData.toLocationId) {
        toast.error("Source and destination cannot be the same");
        return;
      }
    }

    const quantityChange = adjustmentType === "add" ? qty : -qty;

    if (adjustmentType !== "transfer") {
      const newQuantity = adjustingVariant.stockQuantity + quantityChange;
      if (newQuantity < 0) {
        toast.error("Stock cannot be negative");
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/inventory/${adjustingVariant.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityChange: adjustmentType === "transfer" ? qty : quantityChange,
          type: adjustmentType === "transfer" ? "transfer" : formData.type,
          reference: formData.reference,
          notes: formData.notes,
          locationId: formData.locationId || null,
          toLocationId: adjustmentType === "transfer" ? formData.toLocationId : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to adjust stock");
      }

      const message = adjustmentType === "transfer"
        ? "Stock transferred successfully"
        : `Stock ${adjustmentType === "add" ? "added" : "removed"} successfully`;

      toast.success(message);
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to adjust stock"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openAdjustDialog = (variant: Variant, type: "add" | "remove" | "transfer") => {
    setAdjustingVariant(variant);
    setAdjustmentType(type);
    setFormData({
      quantity: "",
      type: type === "add" ? "purchase" : type === "remove" ? "sale" : "transfer",
      reference: "",
      notes: "",
      locationId: "",
      toLocationId: "",
    });
  };

  return (
    <div className="space-y-4">
      {/* Inventory Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Items</span>
            </div>
            <p className="text-2xl font-bold">{totalItems}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">In Storage</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{storageTotal}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">On Display</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{displayTotal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Cost Value</span>
            </div>
            <p className="text-2xl font-bold">{formatUsd(totalCostValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sell Value</span>
            </div>
            <p className="text-2xl font-bold">{formatUsd(totalSellValue)}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-emerald-700">Profit</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatUsd(totalPotentialProfit)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Barcode Scanner Section */}
      <div className="rounded-lg border bg-blue-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ScanBarcode className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium text-blue-900">Quick Scan</h3>
          {scannerLoading && (
            <span className="text-sm text-blue-600">Looking up...</span>
          )}
        </div>
        <BarcodeScanner
          onScan={handleBarcodeScan}
          placeholder="Scan barcode to add/remove stock..."
        />
        <p className="mt-2 text-xs text-blue-700">
          Scan a barcode with your phone camera or hardware scanner to quickly adjust stock
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant={filterLowStock ? "default" : "outline"}
          onClick={() => setFilterLowStock(!filterLowStock)}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Low Stock ({lowStockCount})
        </Button>
      </div>

      {/* Stock Adjustment Dialog */}
      <Dialog
        open={!!adjustingVariant}
        onOpenChange={(open) => !open && resetForm()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === "add" ? "Add Stock" : adjustmentType === "remove" ? "Remove Stock" : "Transfer Stock"}
            </DialogTitle>
          </DialogHeader>
          {adjustingVariant && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="font-medium">
                  {adjustingVariant.product.brand.name} -{" "}
                  {adjustingVariant.product.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {adjustingVariant.specification.label} | Total Stock:{" "}
                  {adjustingVariant.stockQuantity}
                </p>
                {adjustingVariant.locationStock.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {adjustingVariant.locationStock.map((ls) => (
                      <Badge key={ls.id} variant="outline" className={ls.location.type === "storage" ? "bg-blue-50" : "bg-green-50"}>
                        {ls.location.name}: {ls.quantity}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  placeholder="Enter quantity"
                />
              </div>

              {adjustmentType === "transfer" ? (
                <>
                  <div className="space-y-2">
                    <Label>From Location *</Label>
                    <Select
                      value={formData.locationId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, locationId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source location" />
                      </SelectTrigger>
                      <SelectContent>
                        {adjustingVariant.locationStock
                          .filter((ls) => ls.quantity > 0)
                          .map((ls) => (
                            <SelectItem key={ls.location.id} value={ls.location.id}>
                              {ls.location.name} ({ls.quantity} available)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-center">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label>To Location *</Label>
                    <Select
                      value={formData.toLocationId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, toLocationId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} ({loc.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="type">Reason</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, type: value })
                      }
                    >
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

                  {locations.length > 0 && (
                    <div className="space-y-2">
                      <Label>Location (Optional)</Label>
                      <Select
                        value={formData.locationId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, locationId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No specific location</SelectItem>
                          {adjustmentType === "remove" ? (
                            // For removal, only show locations with stock
                            adjustingVariant.locationStock
                              .filter((ls) => ls.quantity > 0)
                              .map((ls) => (
                                <SelectItem key={ls.location.id} value={ls.location.id}>
                                  {ls.location.name} ({ls.quantity} available)
                                </SelectItem>
                              ))
                          ) : (
                            // For addition, show all locations
                            locations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                {loc.name} ({loc.type})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="reference">Reference (Optional)</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({ ...formData, reference: e.target.value })
                  }
                  placeholder="e.g., PO-12345 or INV-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes"
                />
              </div>

              <Button
                onClick={handleAdjustment}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading
                  ? "Processing..."
                  : adjustmentType === "add"
                  ? "Add Stock"
                  : adjustmentType === "remove"
                  ? "Remove Stock"
                  : "Transfer Stock"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {inventory.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          No products with variants yet. Add products and their variants first.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Spec</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead className="text-center">Storage</TableHead>
                <TableHead className="text-center">Display</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((variant) => {
                const isLowStock = variant.stockQuantity <= variant.lowStockThreshold;
                const stockValue = variant.costPriceUsd * variant.stockQuantity;
                const storageQty = variant.locationStock
                  .filter((ls) => ls.location.type === "storage")
                  .reduce((s, ls) => s + ls.quantity, 0);
                const displayQty = variant.locationStock
                  .filter((ls) => ls.location.type === "display")
                  .reduce((s, ls) => s + ls.quantity, 0);
                const hasLocationData = variant.locationStock.length > 0;

                return (
                  <Collapsible key={variant.id} asChild>
                    <>
                      <TableRow className={isLowStock ? "bg-orange-50" : ""}>
                        <TableCell>
                          {hasLocationData && (
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRowExpanded(variant.id)}
                              >
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${
                                    expandedRows.has(variant.id) ? "rotate-180" : ""
                                  }`}
                                />
                              </Button>
                            </CollapsibleTrigger>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="outline" className="mb-1">
                              {variant.product.brand.name}
                            </Badge>
                            <p className="font-medium">{variant.product.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>{variant.specification.label}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {variant.barcode || variant.sku || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-blue-600 font-medium">{storageQty}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-green-600 font-medium">{displayQty}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={
                              isLowStock
                                ? "inline-flex items-center gap-1 text-orange-600 font-semibold"
                                : "font-semibold"
                            }
                          >
                            {isLowStock && <AlertTriangle className="h-4 w-4" />}
                            {variant.stockQuantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatUsd(stockValue)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdjustDialog(variant, "add")}
                              title="Add stock"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdjustDialog(variant, "remove")}
                              disabled={variant.stockQuantity === 0}
                              title="Remove stock"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            {hasLocationData && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAdjustDialog(variant, "transfer")}
                                disabled={variant.locationStock.filter((ls) => ls.quantity > 0).length < 1}
                                title="Transfer between locations"
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {hasLocationData && (
                        <CollapsibleContent asChild>
                          <TableRow className="bg-gray-50">
                            <TableCell colSpan={9} className="py-2">
                              <div className="flex flex-wrap gap-3 pl-8">
                                {variant.locationStock.map((ls) => (
                                  <div
                                    key={ls.id}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                                      ls.location.type === "storage"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {ls.location.type === "storage" ? (
                                      <Warehouse className="h-3.5 w-3.5" />
                                    ) : (
                                      <Store className="h-3.5 w-3.5" />
                                    )}
                                    <span className="font-medium">{ls.location.name}:</span>
                                    <span>{ls.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      )}
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
