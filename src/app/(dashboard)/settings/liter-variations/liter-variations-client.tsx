"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2 } from "lucide-react";

type Specification = {
  id: string;
  sizeInLiters: number;
  label: string;
  isDrum: boolean;
  _count: {
    productVariants: number;
  };
};

export function SpecificationsClient({
  initialVariations,
}: {
  initialVariations: Specification[];
}) {
  const [variations, setVariations] = useState(initialVariations);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVariation, setEditingVariation] =
    useState<Specification | null>(null);
  const [formData, setFormData] = useState({
    sizeInLiters: "",
    label: "",
    isDrum: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({ sizeInLiters: "", label: "", isDrum: false });
    setEditingVariation(null);
  };

  const handleAdd = async () => {
    const size = parseFloat(formData.sizeInLiters);
    if (!formData.label.trim()) {
      toast.error("Label is required");
      return;
    }
    if (isNaN(size) || size <= 0) {
      toast.error("Size must be a positive number");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/liter-variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sizeInLiters: size,
          label: formData.label,
          isDrum: formData.isDrum,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create liter variation");
      }

      const newVariation = await res.json();
      setVariations((prev) =>
        [...prev, { ...newVariation, _count: { productVariants: 0 } }].sort(
          (a, b) => a.sizeInLiters - b.sizeInLiters
        )
      );

      toast.success("Liter variation created successfully");
      setIsAddOpen(false);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create liter variation"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingVariation) return;

    const size = parseFloat(formData.sizeInLiters);
    if (!formData.label.trim()) {
      toast.error("Label is required");
      return;
    }
    if (isNaN(size) || size <= 0) {
      toast.error("Size must be a positive number");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/liter-variations/${editingVariation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sizeInLiters: size,
          label: formData.label,
          isDrum: formData.isDrum,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update liter variation");
      }

      const updatedVariation = await res.json();
      setVariations((prev) =>
        prev
          .map((v) =>
            v.id === editingVariation.id
              ? { ...updatedVariation, _count: v._count }
              : v
          )
          .sort((a, b) => a.sizeInLiters - b.sizeInLiters)
      );

      toast.success("Liter variation updated successfully");
      setEditingVariation(null);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update liter variation"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (variation: Specification) => {
    if (variation._count.productVariants > 0) {
      toast.error(
        `Cannot delete "${variation.label}". It's used by ${variation._count.productVariants} product variant(s).`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete "${variation.label}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/liter-variations/${variation.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete liter variation");
      }

      setVariations((prev) => prev.filter((v) => v.id !== variation.id));
      toast.success("Liter variation deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete liter variation"
      );
    }
  };

  const openEditDialog = (variation: Specification) => {
    setEditingVariation(variation);
    setFormData({
      sizeInLiters: variation.sizeInLiters.toString(),
      label: variation.label,
      isDrum: variation.isDrum,
    });
  };

  return (
    <div className="space-y-4">
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => resetForm()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Size
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Liter Size</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size in Liters *</Label>
              <Input
                id="size"
                type="number"
                step="0.1"
                min="0.1"
                value={formData.sizeInLiters}
                onChange={(e) =>
                  setFormData({ ...formData, sizeInLiters: e.target.value })
                }
                placeholder="e.g., 5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                placeholder="e.g., 5L or 200L Drum"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDrum"
                checked={formData.isDrum}
                onChange={(e) =>
                  setFormData({ ...formData, isDrum: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isDrum">This is a drum</Label>
            </div>
            <Button onClick={handleAdd} disabled={isLoading} className="w-full">
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingVariation}
        onOpenChange={(open) => !open && setEditingVariation(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Liter Size</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-size">Size in Liters *</Label>
              <Input
                id="edit-size"
                type="number"
                step="0.1"
                min="0.1"
                value={formData.sizeInLiters}
                onChange={(e) =>
                  setFormData({ ...formData, sizeInLiters: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-label">Label *</Label>
              <Input
                id="edit-label"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isDrum"
                checked={formData.isDrum}
                onChange={(e) =>
                  setFormData({ ...formData, isDrum: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="edit-isDrum">This is a drum</Label>
            </div>
            <Button onClick={handleEdit} disabled={isLoading} className="w-full">
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Size (Liters)</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Used By</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No liter sizes defined yet.
                </TableCell>
              </TableRow>
            ) : (
              variations.map((variation) => (
                <TableRow key={variation.id}>
                  <TableCell className="font-medium">
                    {variation.label}
                  </TableCell>
                  <TableCell>{variation.sizeInLiters}L</TableCell>
                  <TableCell>
                    {variation.isDrum ? (
                      <Badge variant="secondary">Drum</Badge>
                    ) : (
                      <Badge variant="outline">Container</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {variation._count.productVariants} products
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(variation)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(variation)}
                        disabled={variation._count.productVariants > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
