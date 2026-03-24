import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()));
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1)); // 1-12

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    const invoices = await prisma.invoice.findMany({
      where: {
        status: "paid",
        paidDate: { gte: monthStart, lte: monthEnd },
      },
      select: {
        subtotalUsd: true,
        discountUsd: true,
        taxAmountUsd: true,
        totalUsd: true,
      },
    });

    const invoiceCount = invoices.length;
    // Net sales before BTW (subtotal minus discount)
    const totalSalesExclBtw = invoices.reduce(
      (sum, inv) => sum + inv.subtotalUsd - inv.discountUsd,
      0
    );
    const totalBtw = invoices.reduce((sum, inv) => sum + inv.taxAmountUsd, 0);
    const totalInclBtw = invoices.reduce((sum, inv) => sum + inv.totalUsd, 0);

    const exchangeRate = await prisma.exchangeRate.findFirst({
      where: { isCurrent: true },
    });
    const rate = exchangeRate?.rateUsdToSrd || 1;

    return NextResponse.json({
      year,
      month,
      invoiceCount,
      totalSalesExclBtw,
      totalBtw,
      totalInclBtw,
      rate,
    });
  } catch (error) {
    console.error("Error fetching monthly summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly summary" },
      { status: 500 }
    );
  }
}
