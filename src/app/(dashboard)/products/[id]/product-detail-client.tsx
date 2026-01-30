"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { formatUsd, formatSrd, convertUsdToSrd } from "@/lib/currency";

type LiterVariation = {
  id: string;
  label: string;
  sizeInLiters: number;
};

type ProductVariant = {
  id: string;
  costPriceUsd: number;
  priceUsd: number;
  sku: string | null;
  barcode: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  literVariation: LiterVariation;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  brand: { id: string; name: string };
  variants: ProductVariant[];
};

export function ProductDetailClient({
  product,
  literVariations,
  exchangeRate,
}: {
  product: Product;
  literVariations: LiterVariation[];
  exchangeRate: number;
}) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(
    null
  );
  const [formData, setFormData] = useState({
    literVariationId: "",
    costPriceUsd: "",
    priceUsd: "",
    sku: "",
    barcode: "",
    lowStockThreshold: "10",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Get liter variations that are not already used
  const availableLiterVariations = literVariations.filter(
    (lv) => !product.variants.some((v) => v.literVariation.id === lv.id)
  );

  const resetForm = () => {
    setFormData({
      literVariationId: "",
      costPriceUsd: "",
      priceUsd: "",
      sku: "",
      barcode: "",
      lowStockThreshold: "10",
    });
    setEditingVariant(null);
  };

  const handleAddVariant = async () => {
    if (!formData.literVariationId) {
      toast.error("Liter size is required");
      return;
    }
    const price = parseFloat(formData.priceUsd);
    if (isNaN(price) || price < 0) {
      toast.error("Price must be a non-negative number");
      return;
    }

    const costPrice = parseFloat(formData.costPriceUsd) || 0;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/products/${product.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          literVariationId: formData.literVariationId,
          costPriceUsd: costPrice,
          priceUsd: price,
          sku: formData.sku || null,
          barcode: formData.barcode || null,
          lowStockThreshold: parseInt(formData.lowStockThreshold) || 10,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add variant");
      }

      toast.success("Variant added successfully");
      setIsAddOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add variant"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditVariant = async () => {
    if (!editingVariant) return;

    const price = parseFloat(formData.priceUsd);
    if (isNaN(price) || price < 0) {
      toast.error("Price must be a non-negative number");
      return;
    }

    const costPrice = parseFloat(formData.costPriceUsd) || 0;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/products/${product.id}/variants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: editingVariant.id,
          costPriceUsd: costPrice,
          priceUsd: price,
          sku: formData.sku || null,
          barcode: formData.barcode || null,
          lowStockThreshold: parseInt(formData.lowStockThreshold) || 10,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update variant");
      }

      toast.success("Variant updated successfully");
      setEditingVariant(null);
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update variant"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVariant = async (variant: ProductVariant) => {
    if (variant.stockQuantity > 0) {
      toast.error("Cannot delete variant with stock. Adjust inventory first.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete the ${variant.literVariation.label} variant?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/products/${product.id}/variants?variantId=${variant.id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete variant");
      }

      toast.success("Variant deleted successfully");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete variant"
      );
    }
  };

  const openEditDialog = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      literVariationId: variant.literVariation.id,
      costPriceUsd: variant.costPriceUsd.toString(),
      priceUsd: variant.priceUsd.toString(),
      sku: variant.sku || "",
      barcode: variant.barcode || "",
      lowStockThreshold: variant.lowStockThreshold.toString(),
    });
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{product.brand.name}</Badge>
            <h1 className="text-2xl font-bold">{product.name}</h1>
          </div>
          {product.description && (
            <p className="text-muted-foreground">{product.description}</p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Product Variants</CardTitle>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => resetForm()}
                disabled={availableLiterVariations.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Variant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Product Variant</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="literVariation">Liter Size *</Label>
                  <Select
                    value={formData.literVariationId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, literVariationId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLiterVariations.map((lv) => (
                        <SelectItem key={lv.id} value={lv.id}>
                          {lv.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costPriceUsd">Cost Price (USD)</Label>
                  <Input
                    id="costPriceUsd"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPriceUsd}
                    onChange={(e) =>
                      setFormData({ ...formData, costPriceUsd: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceUsd">Sell Price (USD) *</Label>
                  <Input
                    id="priceUsd"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.priceUsd}
                    onChange={(e) =>
                      setFormData({ ...formData, priceUsd: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU (Optional)</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    placeholder="e.g., SHELL-5W30-5L"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode (Optional)</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    placeholder="Scan or enter barcode"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowStockThreshold">Low Stock Alert</Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lowStockThreshold: e.target.value,
                      })
                    }
                  />
                </div>
                <Button
                  onClick={handleAddVariant}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Adding..." : "Add Variant"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Dialog
            open={!!editingVariant}
            onOpenChange={(open) => !open && setEditingVariant(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Edit {editingVariant?.literVariation.label} Variant
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-costPriceUsd">Cost Price (USD)</Label>
                  <Input
                    id="edit-costPriceUsd"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costPriceUsd}
                    onChange={(e) =>
                      setFormData({ ...formData, costPriceUsd: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-priceUsd">Sell Price (USD) *</Label>
                  <Input
                    id="edit-priceUsd"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.priceUsd}
                    onChange={(e) =>
                      setFormData({ ...formData, priceUsd: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sku">SKU (Optional)</Label>
                  <Input
                    id="edit-sku"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-barcode">Barcode (Optional)</Label>
                  <Input
                    id="edit-barcode"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    placeholder="Scan or enter barcode"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lowStockThreshold">Low Stock Alert</Label>
                  <Input
                    id="edit-lowStockThreshold"
                    type="number"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lowStockThreshold: e.target.value,
                      })
                    }
                  />
                </div>
                <Button
                  onClick={handleEditVariant}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {product.variants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {availableLiterVariations.length === 0 ? (
                <div>
                  <p>No liter sizes available.</p>
                  <Link href="/settings/liter-variations">
                    <Button variant="link">Add liter sizes first</Button>
                  </Link>
                </div>
              ) : (
                <p>No variants yet. Add your first variant to set pricing.</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Size</TableHead>
                  <TableHead>Cost (USD)</TableHead>
                  <TableHead>Sell (USD)</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.variants.map((variant) => {
                  const isLowStock =
                    variant.stockQuantity <= variant.lowStockThreshold;
                  const margin = variant.costPriceUsd > 0
                    ? ((variant.priceUsd - variant.costPriceUsd) / variant.costPriceUsd * 100).toFixed(1)
                    : null;
                  return (
                    <TableRow key={variant.id}>
                      <TableCell className="font-medium">
                        {variant.literVariation.label}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {variant.costPriceUsd > 0 ? formatUsd(variant.costPriceUsd) : "-"}
                      </TableCell>
                      <TableCell>{formatUsd(variant.priceUsd)}</TableCell>
                      <TableCell>
                        {margin ? (
                          <span className={parseFloat(margin) > 0 ? "text-green-600" : "text-red-600"}>
                            {margin}%
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {variant.barcode || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {variant.sku || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={
                            isLowStock ? "text-orange-600 font-semibold" : ""
                          }
                        >
                          {variant.stockQuantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(variant)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteVariant(variant)}
                            disabled={variant.stockQuantity > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
