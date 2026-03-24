import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") || String(now.getFullYear()));
  const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const [invoices, exchangeRate] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        status: "paid",
        paidDate: { gte: monthStart, lte: monthEnd },
      },
      include: { customer: true },
      orderBy: { paidDate: "asc" },
    }),
    prisma.exchangeRate.findFirst({ where: { isCurrent: true } }),
  ]);

  const rate = exchangeRate?.rateUsdToSrd || 1;

  const MONTHS_NL = [
    "Januari", "Februari", "Maart", "April", "Mei", "Juni",
    "Juli", "Augustus", "September", "Oktober", "November", "December",
  ];
  const monthName = MONTHS_NL[month - 1];

  // Sheet 1: Invoice detail rows
  const invoiceRows = invoices.map((inv) => {
    const salesExcl = inv.subtotalUsd - inv.discountUsd;
    return {
      "Factuurnummer": inv.invoiceNumber,
      "Datum": inv.paidDate ? inv.paidDate.toISOString().split("T")[0] : "",
      "Klant": inv.customer.name,
      "Verkopen excl. BTW (USD)": parseFloat(salesExcl.toFixed(2)),
      "Verkopen excl. BTW (SRD)": parseFloat((salesExcl * rate).toFixed(2)),
      "BTW (USD)": parseFloat(inv.taxAmountUsd.toFixed(2)),
      "BTW (SRD)": parseFloat((inv.taxAmountUsd * rate).toFixed(2)),
      "Totaal incl. BTW (USD)": parseFloat(inv.totalUsd.toFixed(2)),
      "Totaal incl. BTW (SRD)": parseFloat((inv.totalUsd * rate).toFixed(2)),
    };
  });

  // Sheet 2: Monthly totals summary
  const totalSalesExcl = invoices.reduce((s, i) => s + i.subtotalUsd - i.discountUsd, 0);
  const totalBtw = invoices.reduce((s, i) => s + i.taxAmountUsd, 0);
  const totalIncl = invoices.reduce((s, i) => s + i.totalUsd, 0);

  const summaryRows = [
    { Omschrijving: "Aantal facturen", "Waarde (USD)": invoices.length, "Waarde (SRD)": invoices.length },
    { Omschrijving: "Totale Verkopen excl. BTW", "Waarde (USD)": parseFloat(totalSalesExcl.toFixed(2)), "Waarde (SRD)": parseFloat((totalSalesExcl * rate).toFixed(2)) },
    { Omschrijving: "Totale BTW", "Waarde (USD)": parseFloat(totalBtw.toFixed(2)), "Waarde (SRD)": parseFloat((totalBtw * rate).toFixed(2)) },
    { Omschrijving: "Totaal incl. BTW", "Waarde (USD)": parseFloat(totalIncl.toFixed(2)), "Waarde (SRD)": parseFloat((totalIncl * rate).toFixed(2)) },
  ];

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(invoiceRows);
  ws1["!cols"] = [
    { wch: 16 }, { wch: 12 }, { wch: 24 }, { wch: 22 }, { wch: 22 },
    { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Facturen");

  const ws2 = XLSX.utils.json_to_sheet(summaryRows);
  ws2["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Samenvatting");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `maandoverzicht-${monthName.toLowerCase()}-${year}.xlsx`;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
