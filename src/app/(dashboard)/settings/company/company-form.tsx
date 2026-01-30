"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface CompanyInfo {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  bankName: string | null;
  bankAccUsd: string | null;
  bankAccSrd: string | null;
  bankAccEur: string | null;
}

export function CompanyForm({ company }: { company: CompanyInfo }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: company.name,
    address: company.address || "",
    phone: company.phone || "",
    bankName: company.bankName || "",
    bankAccUsd: company.bankAccUsd || "",
    bankAccSrd: company.bankAccSrd || "",
    bankAccEur: company.bankAccEur || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Company information saved successfully");
      } else {
        toast.error("Failed to save company information");
      }
    } catch (error) {
      console.error("Error updating company:", error);
      toast.error("Failed to save company information");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankAccUsd">USD Account</Label>
              <Input
                id="bankAccUsd"
                value={formData.bankAccUsd}
                onChange={(e) => setFormData({ ...formData, bankAccUsd: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccSrd">SRD Account</Label>
              <Input
                id="bankAccSrd"
                value={formData.bankAccSrd}
                onChange={(e) => setFormData({ ...formData, bankAccSrd: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccEur">EUR Account</Label>
              <Input
                id="bankAccEur"
                value={formData.bankAccEur}
                onChange={(e) => setFormData({ ...formData, bankAccEur: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
