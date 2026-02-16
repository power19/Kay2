import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  BarChart3,
  Receipt,
} from "lucide-react";

export const dynamic = "force-dynamic";

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSrd(amount: number, rate: number): string {
  return `SRD ${(amount * rate).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function getReportData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59
  );
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [paidInvoices, allVariants, invoiceStatusCounts, exchangeRate] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { status: "paid" },
        include: {
          customer: true,
          items: {
            include: {
              variant: {
                include: {
                  product: { include: { brand: true } },
                  specification: true,
                },
              },
            },
          },
        },
        orderBy: { paidDate: "desc" },
      }),
      prisma.productVariant.findMany({
        include: {
          product: { include: { brand: true } },
          specification: true,
        },
      }),
      prisma.invoice.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { totalUsd: true },
      }),
      prisma.exchangeRate.findFirst({
        where: { isCurrent: true },
      }),
    ]);

  const rate = exchangeRate?.rateUsdToSrd || 1;

  // Revenue
  const totalRevenue = paidInvoices.reduce(
    (sum, inv) => sum + inv.totalUsd,
    0
  );
  const thisMonthInvoices = paidInvoices.filter(
    (inv) => inv.paidDate && new Date(inv.paidDate) >= startOfMonth
  );
  const thisMonthRevenue = thisMonthInvoices.reduce(
    (sum, inv) => sum + inv.totalUsd,
    0
  );
  const lastMonthInvoices = paidInvoices.filter(
    (inv) =>
      inv.paidDate &&
      new Date(inv.paidDate) >= startOfLastMonth &&
      new Date(inv.paidDate) <= endOfLastMonth
  );
  const lastMonthRevenue = lastMonthInvoices.reduce(
    (sum, inv) => sum + inv.totalUsd,
    0
  );
  const thisYearRevenue = paidInvoices
    .filter(
      (inv) => inv.paidDate && new Date(inv.paidDate) >= startOfYear
    )
    .reduce((sum, inv) => sum + inv.totalUsd, 0);

  // Top products
  const productSales: Record<
    string,
    {
      name: string;
      brand: string;
      spec: string;
      quantity: number;
      revenue: number;
    }
  > = {};
  for (const inv of paidInvoices) {
    for (const item of inv.items) {
      const key = item.variantId;
      if (!productSales[key]) {
        productSales[key] = {
          name: item.variant.product.name,
          brand: item.variant.product.brand.name,
          spec: item.variant.specification.label,
          quantity: 0,
          revenue: 0,
        };
      }
      productSales[key].quantity += item.quantity;
      productSales[key].revenue += item.quantity * item.unitPriceUsd;
    }
  }
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Top customers
  const customerSpend: Record<
    string,
    {
      name: string;
      company: string | null;
      totalSpent: number;
      invoiceCount: number;
    }
  > = {};
  for (const inv of paidInvoices) {
    const custId = inv.customerId;
    if (!customerSpend[custId]) {
      customerSpend[custId] = {
        name: inv.customer.name,
        company: inv.customer.companyName,
        totalSpent: 0,
        invoiceCount: 0,
      };
    }
    customerSpend[custId].totalSpent += inv.totalUsd;
    customerSpend[custId].invoiceCount += 1;
  }
  const topCustomers = Object.values(customerSpend)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  // Inventory
  const totalStockItems = allVariants.reduce(
    (sum, v) => sum + v.stockQuantity,
    0
  );
  const totalCostValue = allVariants.reduce(
    (sum, v) => sum + v.stockQuantity * v.costPriceUsd,
    0
  );
  const totalSellValue = allVariants.reduce(
    (sum, v) => sum + v.stockQuantity * v.priceUsd,
    0
  );

  // Invoice status summary
  const statusSummary = invoiceStatusCounts.map((s) => ({
    status: s.status,
    count: s._count.id,
    totalUsd: s._sum.totalUsd || 0,
  }));

  // Monthly revenue
  const monthlyRevenue: { month: string; revenue: number }[] = [];
  for (let m = 0; m < 12; m++) {
    const monthStart = new Date(now.getFullYear(), m, 1);
    const monthEnd = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59);
    const monthName = monthStart.toLocaleString("en-US", { month: "short" });
    const monthRev = paidInvoices
      .filter(
        (inv) =>
          inv.paidDate &&
          new Date(inv.paidDate) >= monthStart &&
          new Date(inv.paidDate) <= monthEnd
      )
      .reduce((sum, inv) => sum + inv.totalUsd, 0);
    monthlyRevenue.push({ month: monthName, revenue: monthRev });
  }

  return {
    rate,
    totalRevenue,
    thisMonthRevenue,
    lastMonthRevenue,
    thisYearRevenue,
    paidCount: paidInvoices.length,
    thisMonthCount: thisMonthInvoices.length,
    topProducts,
    topCustomers,
    totalStockItems,
    totalCostValue,
    totalSellValue,
    statusSummary,
    monthlyRevenue,
  };
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-orange-100 text-orange-800",
};

export default async function ReportsPage() {
  const data = await getReportData();
  const maxMonthlyRevenue = Math.max(
    ...data.monthlyRevenue.map((m) => m.revenue),
    1
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      {/* Revenue Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              This Month
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUsd(data.thisMonthRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.thisMonthCount} invoices paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Last Month
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUsd(data.lastMonthRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.lastMonthRevenue > 0 && data.thisMonthRevenue > 0
                ? `${((data.thisMonthRevenue / data.lastMonthRevenue - 1) * 100).toFixed(0)}% vs this month`
                : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              This Year
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUsd(data.thisYearRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatSrd(data.thisYearRevenue, data.rate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              All Time Revenue
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUsd(data.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.paidCount} invoices total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue ({new Date().getFullYear()})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-48">
            {data.monthlyRevenue.map((m) => (
              <div
                key={m.month}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-xs text-muted-foreground">
                  {m.revenue > 0
                    ? `$${(m.revenue / 1000).toFixed(1)}k`
                    : ""}
                </span>
                <div
                  className="w-full bg-blue-500 rounded-t min-h-[2px]"
                  style={{
                    height: `${Math.max(
                      (m.revenue / maxMonthlyRevenue) * 160,
                      2
                    )}px`,
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {m.month}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {data.statusSummary.map((s) => (
              <div
                key={s.status}
                className="flex items-center gap-3 rounded-lg border p-4 min-w-[180px]"
              >
                <Badge className={statusColors[s.status] || ""}>
                  {s.status}
                </Badge>
                <div>
                  <p className="font-semibold">{s.count}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatUsd(s.totalUsd)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sales data yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topProducts.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.brand}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {p.quantity}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatUsd(p.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sales data yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-center">Invoices</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topCustomers.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          {c.company && (
                            <p className="text-xs text-muted-foreground">
                              {c.company}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {c.invoiceCount}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatUsd(c.totalSpent)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory Value */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">
                {data.totalStockItems.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Cost Value</p>
              <p className="text-2xl font-bold">
                {formatUsd(data.totalCostValue)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatSrd(data.totalCostValue, data.rate)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Sell Value</p>
              <p className="text-2xl font-bold">
                {formatUsd(data.totalSellValue)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatSrd(data.totalSellValue, data.rate)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Potential Profit
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatUsd(data.totalSellValue - data.totalCostValue)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatSrd(
                  data.totalSellValue - data.totalCostValue,
                  data.rate
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
