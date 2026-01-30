import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";
import { formatUsd, formatSrd, convertUsdToSrd } from "@/lib/currency";

export const dynamic = "force-dynamic";

async function getQuotes() {
  return prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      _count: {
        select: { items: true },
      },
    },
  });
}

async function getExchangeRate() {
  const rate = await prisma.exchangeRate.findFirst({
    where: { isCurrent: true },
  });
  return rate?.rateUsdToSrd ?? 0;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-orange-100 text-orange-800",
};

export default async function QuotesPage() {
  const [quotes, exchangeRate] = await Promise.all([
    getQuotes(),
    getExchangeRate(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quotes</h1>
        <Link href="/quotes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Quote
          </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total (USD)</TableHead>
              <TableHead>Total (SRD)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No quotes yet. Create your first quote to get started.
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">
                    {quote.quoteNumber}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{quote.customer.name}</p>
                      {quote.customer.companyName && (
                        <p className="text-sm text-muted-foreground">
                          {quote.customer.companyName}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{quote._count.items}</TableCell>
                  <TableCell>{formatUsd(quote.totalUsd)}</TableCell>
                  <TableCell>
                    {formatSrd(convertUsdToSrd(quote.totalUsd, quote.exchangeRate))}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[quote.status]}>
                      {quote.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(quote.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link href={`/quotes/${quote.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
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
