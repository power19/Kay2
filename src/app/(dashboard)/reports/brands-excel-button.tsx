"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function BrandsExcelButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports/brands-excel");
      if (!res.ok) throw new Error("Download mislukt");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const disposition = res.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="(.+)"/)?.[1] ?? "merken-rapport.xlsx";
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch {
      toast.error("Kon het Excel rapport niet downloaden");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleDownload} disabled={isLoading}>
      <Download className="mr-2 h-4 w-4" />
      {isLoading ? "Bezig..." : "Excel Merken Rapport"}
    </Button>
  );
}
