import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const lastInvoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: `INV-${year}-` } },
    orderBy: { createdAt: "desc" },
  });

  const sequence = lastInvoice
    ? parseInt(lastInvoice.invoiceNumber.split("-")[2]) + 1
    : 1;

  return `INV-${year}-${sequence.toString().padStart(5, "0")}`;
}

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
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
    });
    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      items,
      notes,
      dueDate,
      discountPercent = 0,
      taxRate = 0,
      paymentTerms = "CASH/BANK"
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer is required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Get current exchange rate
    const exchangeRateRecord = await prisma.exchangeRate.findFirst({
      where: { isCurrent: true },
    });

    if (!exchangeRateRecord) {
      return NextResponse.json(
        { error: "Exchange rate not set" },
        { status: 400 }
      );
    }

    const invoiceNumber = await generateInvoiceNumber();

    // Calculate totals
    const subtotalUsd = items.reduce(
      (sum: number, item: { quantity: number; unitPriceUsd: number }) =>
        sum + item.quantity * item.unitPriceUsd,
      0
    );

    // Calculate discount
    const discountUsd = subtotalUsd * (discountPercent / 100);
    const afterDiscountUsd = subtotalUsd - discountUsd;

    // Calculate tax (BTW)
    const taxAmountUsd = afterDiscountUsd * (taxRate / 100);
    const totalUsd = afterDiscountUsd + taxAmountUsd;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        exchangeRate: exchangeRateRecord.rateUsdToSrd,
        subtotalUsd,
        discountPercent,
        discountUsd,
        taxRate,
        taxAmountUsd,
        totalUsd,
        paymentTerms,
        notes: notes || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        items: {
          create: items.map(
            (item: { variantId: string; quantity: number; unitPriceUsd: number }) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPriceUsd: item.unitPriceUsd,
            })
          ),
        },
      },
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
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
