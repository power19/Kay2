"use client";

import { useState } from "react";
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
import { Plus, Pencil, Trash2, Warehouse, Store } from "lucide-react";

type Location = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  sortOrder: number;
  totalItems: number;
  _count: {
    variantStock: number;
  };
};

export function LocationsClient({
  initialLocations,
}: {
  initialLocations: Location[];
}) {
  const [locations, setLocations] = useState(initialLocations);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "storage",
    description: "",
    sortOrder: "0",
  });
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({ name: "", type: "storage", description: "", sortOrder: "0" });
    setEditingLocation(null);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          description: formData.description || null,
          sortOrder: parseInt(formData.sortOrder) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create location");
      }

      const newLocation = await res.json();
      setLocations((prev) =>
        [...prev, { ...newLocation, totalItems: 0, _count: { variantStock: 0 } }].sort(
          (a, b) => a.sortOrder - b.sortOrder
        )
      );

      toast.success("Location created successfully");
      setIsAddOpen(false);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create location"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingLocation) return;

    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/locations/${editingLocation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          description: formData.description || null,
          sortOrder: parseInt(formData.sortOrder) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update location");
      }

      const updatedLocation = await res.json();
      setLocations((prev) =>
        prev
          .map((l) =>
            l.id === editingLocation.id
              ? { ...updatedLocation, totalItems: l.totalItems, _count: l._count }
              : l
          )
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );

      toast.success("Location updated successfully");
      setEditingLocation(null);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update location"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (location: Location) => {
    if (location.totalItems > 0) {
      toast.error(
        `Cannot delete "${location.name}". It has ${location.totalItems} items. Transfer them first.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete "${location.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/locations/${location.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete location");
      }

      setLocations((prev) => prev.filter((l) => l.id !== location.id));
      toast.success("Location deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete location"
      );
    }
  };

  const openEditDialog = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      type: location.type,
      description: location.description || "",
      sortOrder: location.sortOrder.toString(),
    });
  };

  const storageLocations = locations.filter((l) => l.type === "storage");
  const displayLocations = locations.filter((l) => l.type === "display");

  return (
    <div className="space-y-6">
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => resetForm()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Rack A1, Display Front"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
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
                  <SelectItem value="storage">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4" />
                      Storage (Racks/Warehouse)
                    </div>
                  </SelectItem>
                  <SelectItem value="display">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Display (Shop Floor)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="e.g., Back wall, near entrance"
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
              {isLoading ? "Creating..." : "Create Location"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingLocation}
        onOpenChange={(open) => !open && setEditingLocation(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type *</Label>
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
                  <SelectItem value="storage">Storage (Racks/Warehouse)</SelectItem>
                  <SelectItem value="display">Display (Shop Floor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
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

      {/* Storage Locations */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">Storage Locations (Racks)</h3>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Products</TableHead>
                <TableHead className="text-center">Total Items</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storageLocations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No storage locations yet. Add racks like "Rack A1", "Rack B2", etc.
                  </TableCell>
                </TableRow>
              ) : (
                storageLocations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50">
                          {location.name}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {location.description || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {location._count.variantStock}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {location.totalItems}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(location)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(location)}
                          disabled={location.totalItems > 0}
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

      {/* Display Locations */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold">Display Locations (Shop Floor)</h3>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Products</TableHead>
                <TableHead className="text-center">Total Items</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayLocations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No display locations yet. Add areas like "Display Front", "Window", etc.
                  </TableCell>
                </TableRow>
              ) : (
                displayLocations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50">
                          {location.name}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {location.description || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {location._count.variantStock}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {location.totalItems}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(location)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(location)}
                          disabled={location.totalItems > 0}
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
    </div>
  );
}
