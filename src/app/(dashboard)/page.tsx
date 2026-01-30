import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Tags, FileText, Receipt, AlertTriangle } from "lucide-react";
import Link from "next/link";

async function getStats() {
  const [
    productsCount,
    brandsCount,
    quotesCount,
    invoicesCount,
    allVariants,
    pendingInvoices,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.brand.count(),
    prisma.quote.count({ where: { status: { in: ["draft", "sent"] } } }),
    prisma.invoice.count({ where: { status: { in: ["draft", "sent"] } } }),
    prisma.productVariant.findMany({
      include: {
        product: { include: { brand: true } },
        literVariation: true,
      },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["sent"] } },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Filter low stock items client-side
  const lowStockItems = allVariants
    .filter((v) => v.stockQuantity <= v.lowStockThreshold)
    .slice(0, 5);

  return {
    productsCount,
    brandsCount,
    quotesCount,
    invoicesCount,
    lowStockItems,
    pendingInvoices,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.productsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brands</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.brandsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.quotesCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.invoicesCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All items are well stocked
              </p>
            ) : (
              <div className="space-y-3">
                {stats.lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {item.product.brand.name} - {item.product.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.literVariation.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-600">
                        {item.stockQuantity} left
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Threshold: {item.lowStockThreshold}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/inventory"
              className="mt-4 inline-block text-sm text-blue-600 hover:underline"
            >
              View all inventory →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.pendingInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending invoices
              </p>
            ) : (
              <div className="space-y-3">
                {stats.pendingInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.customer.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${invoice.totalUsd.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/invoices"
              className="mt-4 inline-block text-sm text-blue-600 hover:underline"
            >
              View all invoices →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
