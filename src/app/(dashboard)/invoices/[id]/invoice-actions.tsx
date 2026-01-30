"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  MoreVertical,
  Send,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
};

export function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const updateStatus = async (status: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      toast.success(`Invoice marked as ${status}`);
      router.refresh();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInvoice = async () => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete invoice");
      }

      toast.success("Invoice deleted");
      router.push("/invoices");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete invoice"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {invoice.status === "draft" && (
          <DropdownMenuItem onClick={() => updateStatus("sent")}>
            <Send className="mr-2 h-4 w-4" />
            Mark as Sent
          </DropdownMenuItem>
        )}
        {invoice.status === "sent" && (
          <>
            <DropdownMenuItem onClick={() => updateStatus("paid")}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Paid
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus("overdue")}>
              <XCircle className="mr-2 h-4 w-4" />
              Mark as Overdue
            </DropdownMenuItem>
          </>
        )}
        {invoice.status === "overdue" && (
          <DropdownMenuItem onClick={() => updateStatus("paid")}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark as Paid
          </DropdownMenuItem>
        )}
        {invoice.status !== "paid" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => updateStatus("cancelled")}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Invoice
            </DropdownMenuItem>
          </>
        )}
        {invoice.status !== "paid" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={deleteInvoice} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Invoice
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
