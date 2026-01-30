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
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Specification = {
  id: string;
  value: string;
  label: string;
  sortOrder: number;
  _count: {
    productVariants: number;
  };
};

export function SpecificationsClient({
  initialSpecifications,
}: {
  initialSpecifications: Specification[];
}) {
  const [specifications, setSpecifications] = useState(initialSpecifications);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specification | null>(null);
  const [formData, setFormData] = useState({
    value: "",
    label: "",
    sortOrder: "0",
  });
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({ value: "", label: "", sortOrder: "0" });
    setEditingSpec(null);
  };

  const handleAdd = async () => {
    if (!formData.label.trim()) {
      toast.error("Label is required");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/specifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: formData.value,
          label: formData.label,
          sortOrder: parseInt(formData.sortOrder) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create specification");
      }

      const newSpec = await res.json();
      setSpecifications((prev) =>
        [...prev, { ...newSpec, _count: { productVariants: 0 } }].sort(
          (a, b) => a.sortOrder - b.sortOrder
        )
      );

      toast.success("Specification created successfully");
      setIsAddOpen(false);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create specification"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingSpec) return;

    if (!formData.label.trim()) {
      toast.error("Label is required");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/specifications/${editingSpec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: formData.value,
          label: formData.label,
          sortOrder: parseInt(formData.sortOrder) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update specification");
      }

      const updatedSpec = await res.json();
      setSpecifications((prev) =>
        prev
          .map((s) =>
            s.id === editingSpec.id
              ? { ...updatedSpec, _count: s._count }
              : s
          )
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );

      toast.success("Specification updated successfully");
      setEditingSpec(null);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update specification"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (spec: Specification) => {
    if (spec._count.productVariants > 0) {
      toast.error(
        `Cannot delete "${spec.label}". It's used by ${spec._count.productVariants} product variant(s).`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete "${spec.label}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/specifications/${spec.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete specification");
      }

      setSpecifications((prev) => prev.filter((s) => s.id !== spec.id));
      toast.success("Specification deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete specification"
      );
    }
  };

  const openEditDialog = (spec: Specification) => {
    setEditingSpec(spec);
    setFormData({
      value: spec.value,
      label: spec.label,
      sortOrder: spec.sortOrder.toString(),
    });
  };

  return (
    <div className="space-y-4">
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => resetForm()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Specification
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Specification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                placeholder="e.g., 128GB, Black, Large"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value (Optional)</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                placeholder="e.g., storage, color, size"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <Button onClick={handleAdd} disabled={isLoading} className="w-full">
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingSpec}
        onOpenChange={(open) => !open && setEditingSpec(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Specification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <div className="space-y-2">
              <Label htmlFor="edit-value">Value (Optional)</Label>
              <Input
                id="edit-value"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sortOrder">Sort Order</Label>
              <Input
                id="edit-sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: e.target.value })
                }
              />
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
              <TableHead>Value</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead className="text-center">Used By</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {specifications.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No specifications defined yet. Add specifications like "128GB", "256GB", "Black", "White", etc.
                </TableCell>
              </TableRow>
            ) : (
              specifications.map((spec) => (
                <TableRow key={spec.id}>
                  <TableCell className="font-medium">
                    {spec.label}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {spec.value || "-"}
                  </TableCell>
                  <TableCell>{spec.sortOrder}</TableCell>
                  <TableCell className="text-center">
                    {spec._count.productVariants} products
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(spec)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(spec)}
                        disabled={spec._count.productVariants > 0}
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
