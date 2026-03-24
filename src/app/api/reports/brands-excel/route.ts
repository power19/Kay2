import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET() {
  const [brands, paidInvoices, exchangeRate] = await Promise.all([
    prisma.brand.findMany({
      include: {
        products: {
          include: {
            variants: {
              include: { specification: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.invoice.findMany({
      where: { status: "paid" },
      include: {
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
    }),
    prisma.exchangeRate.findFirst({ where: { isCurrent: true } }),
  ]);

  const rate = exchangeRate?.rateUsdToSrd || 1;

  // Aggregate sales per variant
  const variantSales: Record<string, { quantity: number; revenue: number }> = {};
  for (const inv of paidInvoices) {
    for (const item of inv.items) {
      if (!variantSales[item.variantId]) {
        variantSales[item.variantId] = { quantity: 0, revenue: 0 };
      }
      variantSales[item.variantId].quantity += item.quantity;
      variantSales[item.variantId].revenue += item.quantity * item.unitPriceUsd;
    }
  }

  // --- Sheet 1: Brand Overview ---
  type BrandOverviewRow = {
    Merk: string;
    "Aantal Producten": number;
    "Verkochte Stuks": number;
    "Omzet (USD)": number;
    "Omzet (SRD)": number;
    "Voorraad (stuks)": number;
    "Kostprijs Waarde (USD)": number;
    "Verkoopwaarde (USD)": number;
    "Potentiële Winst (USD)": number;
  };
  const brandOverview: BrandOverviewRow[] = brands.map((brand) => {
    let unitsSold = 0;
    let revenue = 0;
    let stockItems = 0;
    let costValue = 0;
    let sellValue = 0;

    for (const product of brand.products) {
      for (const variant of product.variants) {
        const sales = variantSales[variant.id];
        if (sales) {
          unitsSold += sales.quantity;
          revenue += sales.revenue;
        }
        stockItems += variant.stockQuantity;
        costValue += variant.stockQuantity * variant.costPriceUsd;
        sellValue += variant.stockQuantity * variant.priceUsd;
      }
    }

    return {
      Merk: brand.name,
      "Aantal Producten": brand.products.length,
      "Verkochte Stuks": unitsSold,
      "Omzet (USD)": parseFloat(revenue.toFixed(2)),
      "Omzet (SRD)": parseFloat((revenue * rate).toFixed(2)),
      "Voorraad (stuks)": stockItems,
      "Kostprijs Waarde (USD)": parseFloat(costValue.toFixed(2)),
      "Verkoopwaarde (USD)": parseFloat(sellValue.toFixed(2)),
      "Potentiële Winst (USD)": parseFloat((sellValue - costValue).toFixed(2)),
    };
  });

  // --- Sheet 2: Products per Brand ---
  type ProductRow = {
    Merk: string;
    Product: string;
    Specificatie: string;
    "Verkochte Stuks": number;
    "Omzet (USD)": number;
    "Huidige Voorraad": number;
    "Kostprijs (USD)": number;
    "Verkoopprijs (USD)": number;
    "Kostprijs Waarde (USD)": number;
    "Verkoopwaarde (USD)": number;
  };
  const productRows: ProductRow[] = [];

  for (const brand of brands) {
    for (const product of brand.products) {
      for (const variant of product.variants) {
        const sales = variantSales[variant.id] || { quantity: 0, revenue: 0 };
        const specLabel = variant.specification?.label || "";

        productRows.push({
          Merk: brand.name,
          Product: product.name,
          Specificatie: specLabel,
          "Verkochte Stuks": sales.quantity,
          "Omzet (USD)": parseFloat(sales.revenue.toFixed(2)),
          "Huidige Voorraad": variant.stockQuantity,
          "Kostprijs (USD)": variant.costPriceUsd,
          "Verkoopprijs (USD)": variant.priceUsd,
          "Kostprijs Waarde (USD)": parseFloat(
            (variant.stockQuantity * variant.costPriceUsd).toFixed(2)
          ),
          "Verkoopwaarde (USD)": parseFloat(
            (variant.stockQuantity * variant.priceUsd).toFixed(2)
          ),
        });
      }
    }
  }

  // Create workbook
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(brandOverview);
  // Set column widths for sheet 1
  ws1["!cols"] = [
    { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Merk Overzicht");

  const ws2 = XLSX.utils.json_to_sheet(productRows);
  ws2["!cols"] = [
    { wch: 18 }, { wch: 25 }, { wch: 18 }, { wch: 14 }, { wch: 12 },
    { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Producten per Merk");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const date = new Date().toISOString().split("T")[0];
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="merken-rapport-${date}.xlsx"`,
    },
  });
}
