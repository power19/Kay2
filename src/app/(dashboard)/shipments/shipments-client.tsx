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
import { Plus, Pencil, Trash2, Ship, DollarSign } from "lucide-react";
import { formatUsd } from "@/lib/currency";

type Shipment = {
  id: string;
  shipmentNumber: string;
  description: string | null;
  supplier: string | null;
  arrivalDate: Date;
  inklaarKosten: number;
  shippingKosten: number;
  overmakingsKosten: number;
  overigeKosten: number;
  notes: string | null;
  status: string;
  createdAt: Date;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  received: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

export function ShipmentsClient({ shipments }: { shipments: Shipment[] }) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    supplier: "",
    arrivalDate: new Date().toISOString().split("T")[0],
    inklaarKosten: "",
    shippingKosten: "",
    overmakingsKosten: "",
    overigeKosten: "",
    notes: "",
    status: "pending",
  });

  // Calculate totals
  const totalInklaar = shipments.reduce((sum, s) => sum + s.inklaarKosten, 0);
  const totalShipping = shipments.reduce((sum, s) => sum + s.shippingKosten, 0);
  const totalOvermaking = shipments.reduce((sum, s) => sum + s.overmakingsKosten, 0);
  const totalOverige = shipments.reduce((sum, s) => sum + s.overigeKosten, 0);
  const grandTotal = totalInklaar + totalShipping + totalOvermaking + totalOverige;

  const resetForm = () => {
    setFormData({
      description: "",
      supplier: "",
      arrivalDate: new Date().toISOString().split("T")[0],
      inklaarKosten: "",
      shippingKosten: "",
      overmakingsKosten: "",
      overigeKosten: "",
      notes: "",
      status: "pending",
    });
    setEditingShipment(null);
  };

  const openNewDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setFormData({
      description: shipment.description || "",
      supplier: shipment.supplier || "",
      arrivalDate: new Date(shipment.arrivalDate).toISOString().split("T")[0],
      inklaarKosten: shipment.inklaarKosten.toString(),
      shippingKosten: shipment.shippingKosten.toString(),
      overmakingsKosten: shipment.overmakingsKosten.toString(),
      overigeKosten: shipment.overigeKosten.toString(),
      notes: shipment.notes || "",
      status: shipment.status,
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.arrivalDate) {
      toast.error("Arrival date is required");
      return;
    }

    setIsLoading(true);
    try {
      const url = editingShipment
        ? `/api/shipments/${editingShipment.id}`
        : "/api/shipments";
      const method = editingShipment ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save shipment");
      }

      toast.success(editingShipment ? "Shipment updated" : "Shipment created");
      setShowDialog(false);
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shipment?")) return;

    try {
      const res = await fetch(`/api/shipments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Shipment deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete shipment");
    }
  };

  const getShipmentTotal = (s: Shipment) =>
    s.inklaarKosten + s.shippingKosten + s.overmakingsKosten + s.overigeKosten;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Inklarings Kosten</span>
            </div>
            <p className="text-2xl font-bold">{formatUsd(totalInklaar)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Shipping Kosten</span>
            </div>
            <p className="text-2xl font-bold">{formatUsd(totalShipping)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Overmakings Kosten</span>
            </div>
            <p className="text-2xl font-bold">{formatUsd(totalOvermaking)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Overige Kosten</span>
            </div>
            <p className="text-2xl font-bold">{formatUsd(totalOverige)}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">Total All Costs</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatUsd(grandTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Button */}
      <div className="flex justify-end">
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Shipment
        </Button>
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingShipment ? "Edit Shipment" : "New Shipment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Container from China"
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Arrival Date *</Label>
                <Input
                  type="date"
                  value={formData.arrivalDate}
                  onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Costs (USD)</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Inklarings Kosten</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.inklaarKosten}
                    onChange={(e) => setFormData({ ...formData, inklaarKosten: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shipping Kosten</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.shippingKosten}
                    onChange={(e) => setFormData({ ...formData, shippingKosten: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Overmakings Kosten</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.overmakingsKosten}
                    onChange={(e) => setFormData({ ...formData, overmakingsKosten: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Overige Kosten</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.overigeKosten}
                    onChange={(e) => setFormData({ ...formData, overigeKosten: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
              />
            </div>

            <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
              {isLoading ? "Saving..." : editingShipment ? "Update Shipment" : "Create Shipment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      {shipments.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          No shipments yet. Add your first shipment to start tracking costs.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Arrival Date</TableHead>
                <TableHead className="text-right">Inklaar</TableHead>
                <TableHead className="text-right">Shipping</TableHead>
                <TableHead className="text-right">Overmaking</TableHead>
                <TableHead className="text-right">Overige</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell className="font-mono text-sm">
                    {shipment.shipmentNumber}
                  </TableCell>
                  <TableCell>{shipment.description || "-"}</TableCell>
                  <TableCell>{shipment.supplier || "-"}</TableCell>
                  <TableCell>
                    {new Date(shipment.arrivalDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatUsd(shipment.inklaarKosten)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatUsd(shipment.shippingKosten)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatUsd(shipment.overmakingsKosten)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatUsd(shipment.overigeKosten)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatUsd(getShipmentTotal(shipment))}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[shipment.status]}>
                      {shipment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(shipment)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(shipment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
