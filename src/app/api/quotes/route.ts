import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const lastQuote = await prisma.quote.findFirst({
    where: { quoteNumber: { startsWith: `Q-${year}-` } },
    orderBy: { createdAt: "desc" },
  });

  const sequence = lastQuote
    ? parseInt(lastQuote.quoteNumber.split("-")[2]) + 1
    : 1;

  return `Q-${year}-${sequence.toString().padStart(5, "0")}`;
}

export async function GET() {
  try {
    const quotes = await prisma.quote.findMany({
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
    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, items, notes, validUntil } = body;

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

    const quoteNumber = await generateQuoteNumber();

    // Calculate totals
    const subtotalUsd = items.reduce(
      (sum: number, item: { quantity: number; unitPriceUsd: number }) =>
        sum + item.quantity * item.unitPriceUsd,
      0
    );

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        customerId,
        exchangeRate: exchangeRateRecord.rateUsdToSrd,
        subtotalUsd,
        totalUsd: subtotalUsd,
        notes: notes || null,
        validUntil: validUntil ? new Date(validUntil) : null,
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

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("Error creating quote:", error);
    return NextResponse.json(
      { error: "Failed to create quote" },
      { status: 500 }
    );
  }
}
