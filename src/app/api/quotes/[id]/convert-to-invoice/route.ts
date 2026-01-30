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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params;

    // Get the quote
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        items: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (quote.status !== "accepted") {
      return NextResponse.json(
        { error: "Only accepted quotes can be converted to invoices" },
        { status: 400 }
      );
    }

    const invoiceNumber = await generateInvoiceNumber();

    // Create invoice from quote
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: quote.customerId,
        quoteId: quote.id,
        exchangeRate: quote.exchangeRate,
        subtotalUsd: quote.subtotalUsd,
        totalUsd: quote.totalUsd,
        notes: quote.notes,
        items: {
          create: quote.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitPriceUsd: item.unitPriceUsd,
          })),
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
    console.error("Error converting quote to invoice:", error);
    return NextResponse.json(
      { error: "Failed to convert quote to invoice" },
      { status: 500 }
    );
  }
}
