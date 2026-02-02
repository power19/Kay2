"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Trash2, Building2 } from "lucide-react";

interface CompanyInfo {
  id: string;
  name: string;
  logo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  finnNumber: string | null;
  bankName: string | null;
  bankAccUsd: string | null;
  bankAccSrd: string | null;
  bankAccEur: string | null;
}

export function CompanyForm({ company }: { company: CompanyInfo }) {
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logo, setLogo] = useState<string | null>(company.logo);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: company.name,
    address: company.address || "",
    phone: company.phone || "",
    email: company.email || "",
    website: company.website || "",
    finnNumber: company.finnNumber || "",
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await fetch("/api/company/logo", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setLogo(data.logo);
        toast.success("Logo uploaded successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to upload logo");
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleLogoDelete = async () => {
    if (!confirm("Are you sure you want to delete the logo?")) return;

    setUploadingLogo(true);
    try {
      const res = await fetch("/api/company/logo", {
        method: "DELETE",
      });

      if (res.ok) {
        setLogo(null);
        toast.success("Logo deleted successfully");
      } else {
        toast.error("Failed to delete logo");
      }
    } catch (error) {
      console.error("Error deleting logo:", error);
      toast.error("Failed to delete logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Logo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            {/* Logo Preview */}
            <div className="flex-shrink-0">
              {logo ? (
                <div className="relative h-32 w-32 overflow-hidden rounded-lg border bg-white">
                  <Image
                    src={logo}
                    alt="Company Logo"
                    fill
                    className="object-contain p-2"
                  />
                </div>
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                  <Building2 className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="space-y-3">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingLogo ? "Uploading..." : "Upload Logo"}
                </Button>
              </div>
              {logo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLogoDelete}
                  disabled={uploadingLogo}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Logo
                </Button>
              )}
              <p className="text-sm text-muted-foreground">
                Recommended: PNG or JPG, max 2MB.
                <br />
                Logo will appear on invoices and quotes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Details */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finnNumber">Fin Number (Fiscal ID)</Label>
              <Input
                id="finnNumber"
                value={formData.finnNumber}
                onChange={(e) => setFormData({ ...formData, finnNumber: e.target.value })}
                placeholder="Tax identification number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
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
