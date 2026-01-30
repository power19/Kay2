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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Minus, AlertTriangle } from "lucide-react";
import { formatUsd, formatSrd, convertUsdToSrd } from "@/lib/currency";

type Variant = {
  id: string;
  priceUsd: number;
  sku: string | null;
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

export function InventoryClient({
  inventory,
  exchangeRate,
}: {
  inventory: Variant[];
  exchangeRate: number;
}) {
  const router = useRouter();
  const [adjustingVariant, setAdjustingVariant] = useState<Variant | null>(
    null
  );
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [formData, setFormData] = useState({
    quantity: "",
    type: "adjustment",
    reference: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [filterLowStock, setFilterLowStock] = useState(false);

  const filteredInventory = filterLowStock
    ? inventory.filter((v) => v.stockQuantity <= v.lowStockThreshold)
    : inventory;

  const lowStockCount = inventory.filter(
    (v) => v.stockQuantity <= v.lowStockThreshold
  ).length;

  const resetForm = () => {
    setFormData({
      quantity: "",
      type: "adjustment",
      reference: "",
      notes: "",
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

    const quantityChange = adjustmentType === "add" ? qty : -qty;
    const newQuantity = adjustingVariant.stockQuantity + quantityChange;

    if (newQuantity < 0) {
      toast.error("Stock cannot be negative");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/inventory/${adjustingVariant.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityChange,
          type: formData.type,
          reference: formData.reference,
          notes: formData.notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to adjust stock");
      }

      toast.success(
        `Stock ${adjustmentType === "add" ? "added" : "removed"} successfully`
      );
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

  const openAdjustDialog = (variant: Variant, type: "add" | "remove") => {
    setAdjustingVariant(variant);
    setAdjustmentType(type);
    setFormData({
      quantity: "",
      type: type === "add" ? "purchase" : "sale",
      reference: "",
      notes: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          variant={filterLowStock ? "default" : "outline"}
          onClick={() => setFilterLowStock(!filterLowStock)}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Low Stock ({lowStockCount})
        </Button>
      </div>

      <Dialog
        open={!!adjustingVariant}
        onOpenChange={(open) => !open && resetForm()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === "add" ? "Add Stock" : "Remove Stock"}
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
                  {adjustingVariant.literVariation.label} | Current Stock:{" "}
                  {adjustingVariant.stockQuantity}
                </p>
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
                  : "Remove Stock"}
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
                <TableHead>Product</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price (USD)</TableHead>
                <TableHead>Price (SRD)</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((variant) => {
                const isLowStock =
                  variant.stockQuantity <= variant.lowStockThreshold;
                return (
                  <TableRow key={variant.id}>
                    <TableCell>
                      <div>
                        <Badge variant="outline" className="mb-1">
                          {variant.product.brand.name}
                        </Badge>
                        <p className="font-medium">{variant.product.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{variant.literVariation.label}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {variant.sku || "-"}
                    </TableCell>
                    <TableCell>{formatUsd(variant.priceUsd)}</TableCell>
                    <TableCell>
                      {formatSrd(convertUsdToSrd(variant.priceUsd, exchangeRate))}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          isLowStock
                            ? "inline-flex items-center gap-1 text-orange-600 font-semibold"
                            : ""
                        }
                      >
                        {isLowStock && (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        {variant.stockQuantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAdjustDialog(variant, "add")}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAdjustDialog(variant, "remove")}
                          disabled={variant.stockQuantity === 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
