"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintButtonProps {
  documentTitle?: string;
}

export function PrintButton({ documentTitle }: PrintButtonProps) {
  const handlePrint = () => {
    if (documentTitle) {
      const originalTitle = document.title;
      document.title = documentTitle;
      window.print();
      // Restore original title after a short delay
      setTimeout(() => {
        document.title = originalTitle;
      }, 100);
    } else {
      window.print();
    }
  };

  return (
    <Button variant="outline" onClick={handlePrint}>
      <Printer className="mr-2 h-4 w-4" />
      Print
    </Button>
  );
}
