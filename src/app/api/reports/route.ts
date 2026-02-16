import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // All paid invoices
    const paidInvoices = await prisma.invoice.findMany({
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
    });

    // Revenue calculations
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.totalUsd, 0);

    const thisMonthInvoices = paidInvoices.filter(
      (inv) => inv.paidDate && new Date(inv.paidDate) >= startOfMonth
    );
    const thisMonthRevenue = thisMonthInvoices.reduce((sum, inv) => sum + inv.totalUsd, 0);

    const lastMonthInvoices = paidInvoices.filter(
      (inv) =>
        inv.paidDate &&
        new Date(inv.paidDate) >= startOfLastMonth &&
        new Date(inv.paidDate) <= endOfLastMonth
    );
    const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + inv.totalUsd, 0);

    const thisYearInvoices = paidInvoices.filter(
      (inv) => inv.paidDate && new Date(inv.paidDate) >= startOfYear
    );
    const thisYearRevenue = thisYearInvoices.reduce((sum, inv) => sum + inv.totalUsd, 0);

    // Top selling products (by quantity sold)
    const productSales: Record<
      string,
      { name: string; brand: string; quantity: number; revenue: number }
    > = {};
    for (const inv of paidInvoices) {
      for (const item of inv.items) {
        const key = `${item.variant.product.brand.name} - ${item.variant.product.name} (${item.variant.specification.label})`;
        if (!productSales[key]) {
          productSales[key] = {
            name: `${item.variant.product.name} (${item.variant.specification.label})`,
            brand: item.variant.product.brand.name,
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

    // Top customers (by total spent)
    const customerSpend: Record<
      string,
      { name: string; company: string | null; totalSpent: number; invoiceCount: number }
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

    // Inventory value
    const allVariants = await prisma.productVariant.findMany({
      include: {
        product: { include: { brand: true } },
        specification: true,
      },
    });

    const totalStockItems = allVariants.reduce((sum, v) => sum + v.stockQuantity, 0);
    const totalCostValue = allVariants.reduce(
      (sum, v) => sum + v.stockQuantity * v.costPriceUsd,
      0
    );
    const totalSellValue = allVariants.reduce(
      (sum, v) => sum + v.stockQuantity * v.priceUsd,
      0
    );

    // Invoice status counts
    const invoiceStatusCounts = await prisma.invoice.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { totalUsd: true },
    });

    const statusSummary = invoiceStatusCounts.map((s) => ({
      status: s.status,
      count: s._count.id,
      totalUsd: s._sum.totalUsd || 0,
    }));

    // Monthly revenue for the current year (for chart data)
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

    // Get exchange rate for display
    const exchangeRate = await prisma.exchangeRate.findFirst({
      where: { isCurrent: true },
    });

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        thisYear: thisYearRevenue,
        paidInvoiceCount: paidInvoices.length,
        thisMonthCount: thisMonthInvoices.length,
      },
      topProducts,
      topCustomers,
      inventory: {
        totalItems: totalStockItems,
        costValue: totalCostValue,
        sellValue: totalSellValue,
        potentialProfit: totalSellValue - totalCostValue,
      },
      statusSummary,
      monthlyRevenue,
      exchangeRate: exchangeRate?.rateUsdToSrd || 1,
    });
  } catch (error) {
    console.error("Error generating reports:", error);
    return NextResponse.json(
      { error: "Failed to generate reports" },
      { status: 500 }
    );
  }
}
