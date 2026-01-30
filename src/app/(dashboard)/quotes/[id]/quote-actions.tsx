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
  FileText,
  Trash2,
} from "lucide-react";

type Quote = {
  id: string;
  quoteNumber: string;
  status: string;
};

export function QuoteActions({ quote }: { quote: Quote }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const updateStatus = async (status: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      toast.success(`Quote marked as ${status}`);
      router.refresh();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  const convertToInvoice = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/convert-to-invoice`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to convert to invoice");
      }

      const invoice = await res.json();
      toast.success("Quote converted to invoice");
      router.push(`/invoices/${invoice.id}`);
    } catch (error) {
      toast.error("Failed to convert to invoice");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteQuote = async () => {
    if (!confirm("Are you sure you want to delete this quote?")) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete quote");
      }

      toast.success("Quote deleted");
      router.push("/quotes");
    } catch (error) {
      toast.error("Failed to delete quote");
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
        {quote.status === "draft" && (
          <DropdownMenuItem onClick={() => updateStatus("sent")}>
            <Send className="mr-2 h-4 w-4" />
            Mark as Sent
          </DropdownMenuItem>
        )}
        {quote.status === "sent" && (
          <>
            <DropdownMenuItem onClick={() => updateStatus("accepted")}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Accepted
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus("rejected")}>
              <XCircle className="mr-2 h-4 w-4" />
              Mark as Rejected
            </DropdownMenuItem>
          </>
        )}
        {quote.status === "accepted" && (
          <DropdownMenuItem onClick={convertToInvoice}>
            <FileText className="mr-2 h-4 w-4" />
            Convert to Invoice
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={deleteQuote} className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Quote
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
