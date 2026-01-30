"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { formatUsd } from "@/lib/currency";

type Brand = {
  id: string;
  name: string;
};

type Specification = {
  id: string;
  label: string;
  sizeInLiters: number;
};

type ProductVariant = {
  id: string;
  priceUsd: number;
  stockQuantity: number;
  specification: Specification;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  brand: Brand;
  variants: ProductVariant[];
};

export function ProductsClient({
  initialProducts,
  brands,
  specifications,
}: {
  initialProducts: Product[];
  brands: Brand[];
  specifications: Specification[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    brandId: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({ name: "", description: "", brandId: "" });
    setEditingProduct(null);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!formData.brandId) {
      toast.error("Brand is required");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create product");
      }

      const newProduct = await res.json();
      const brand = brands.find((b) => b.id === formData.brandId);
      setProducts((prev) =>
        [
          ...prev,
          {
            ...newProduct,
            brand: brand || { id: formData.brandId, name: "" },
            variants: [],
          },
        ].sort((a, b) => {
          const brandCompare = a.brand.name.localeCompare(b.brand.name);
          if (brandCompare !== 0) return brandCompare;
          return a.name.localeCompare(b.name);
        })
      );

      toast.success("Product created successfully");
      setIsAddOpen(false);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create product"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingProduct) return;
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!formData.brandId) {
      toast.error("Brand is required");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update product");
      }

      const updatedProduct = await res.json();
      const brand = brands.find((b) => b.id === formData.brandId);
      setProducts((prev) =>
        prev
          .map((p) =>
            p.id === editingProduct.id
              ? {
                  ...updatedProduct,
                  brand: brand || { id: formData.brandId, name: "" },
                  variants: p.variants,
                }
              : p
          )
          .sort((a, b) => {
            const brandCompare = a.brand.name.localeCompare(b.brand.name);
            if (brandCompare !== 0) return brandCompare;
            return a.name.localeCompare(b.name);
          })
      );

      toast.success("Product updated successfully");
      setEditingProduct(null);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update product"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (product.variants.length > 0) {
      const hasStock = product.variants.some((v) => v.stockQuantity > 0);
      if (hasStock) {
        toast.error(
          "Cannot delete product with stock. Adjust inventory first."
        );
        return;
      }
    }

    if (
      !confirm(
        `Are you sure you want to delete "${product.brand.name} - ${product.name}"?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete product");
      }

      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success("Product deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete product"
      );
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      brandId: product.brand.id,
    });
  };

  return (
    <div className="space-y-4">
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => resetForm()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Select
                value={formData.brandId}
                onValueChange={(value) =>
                  setFormData({ ...formData, brandId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Motor Oil 5W-30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
            <Button onClick={handleAdd} disabled={isLoading} className="w-full">
              {isLoading ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-brand">Brand *</Label>
              <Select
                value={formData.brandId}
                onValueChange={(value) =>
                  setFormData({ ...formData, brandId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Product Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <Button
              onClick={handleEdit}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {brands.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">
            You need to create a brand first before adding products.
          </p>
          <Link href="/brands">
            <Button className="mt-4">Go to Brands</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead>Price Range</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No products yet. Add your first product to get started.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const prices = product.variants.map((v) => v.priceUsd);
                  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Badge variant="outline">{product.brand.name}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {product.name}
                        {product.description && (
                          <p className="text-sm text-muted-foreground">
                            {product.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.variants.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {product.variants.map((v) => (
                              <Badge key={v.id} variant="secondary">
                                {v.specification.label}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            No variants
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.variants.length > 0 ? (
                          minPrice === maxPrice ? (
                            formatUsd(minPrice)
                          ) : (
                            `${formatUsd(minPrice)} - ${formatUsd(maxPrice)}`
                          )
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/products/${product.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
