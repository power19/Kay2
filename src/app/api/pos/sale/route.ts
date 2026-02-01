import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type SaleItem = {
  variantId: string;
  quantity: number;
  unitPriceUsd: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      locationId,
      customerId,
      paymentMethod,
      discountPercent,
      subtotalUsd,
      discountUsd,
      totalUsd,
      exchangeRate,
    } = body as {
      items: SaleItem[];
      locationId: string;
      customerId: string | null;
      paymentMethod: string;
      discountPercent: number;
      subtotalUsd: number;
      discountUsd: number;
      totalUsd: number;
      exchangeRate: number;
    };

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No items in cart" },
        { status: 400 }
      );
    }

    if (!locationId) {
      return NextResponse.json(
        { error: "Location is required" },
        { status: 400 }
      );
    }

    // Verify stock availability for all items
    for (const item of items) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: {
          locationStock: {
            where: { locationId },
          },
        },
      });

      if (!variant) {
        return NextResponse.json(
          { error: `Product not found: ${item.variantId}` },
          { status: 404 }
        );
      }

      const locationQty = variant.locationStock[0]?.quantity || 0;
      if (locationQty < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${item.variantId}. Available: ${locationQty}` },
          { status: 400 }
        );
      }
    }

    // Generate invoice number
    const year = new Date().getFullYear();
    const lastInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: `INV-${year}-` } },
      orderBy: { createdAt: "desc" },
    });

    const sequence = lastInvoice
      ? parseInt(lastInvoice.invoiceNumber.split("-")[2]) + 1
      : 1;
    const invoiceNumber = `INV-${year}-${sequence.toString().padStart(5, "0")}`;

    // Get or create walk-in customer if no customer selected
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      let walkInCustomer = await prisma.customer.findFirst({
        where: { name: "Walk-in Customer" },
      });

      if (!walkInCustomer) {
        walkInCustomer = await prisma.customer.create({
          data: { name: "Walk-in Customer" },
        });
      }
      finalCustomerId = walkInCustomer.id;
    }

    // Create invoice and process sale in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: finalCustomerId!,
          exchangeRate,
          subtotalUsd,
          discountPercent,
          discountUsd,
          totalUsd,
          status: "paid",
          paidDate: new Date(),
          paymentTerms: paymentMethod.toUpperCase(),
          items: {
            create: items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPriceUsd: item.unitPriceUsd,
            })),
          },
        },
      });

      // Update stock for each item
      for (const item of items) {
        // Reduce total stock
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });

        // Reduce location stock
        await tx.variantLocation.update({
          where: {
            variantId_locationId: {
              variantId: item.variantId,
              locationId,
            },
          },
          data: {
            quantity: { decrement: item.quantity },
          },
        });

        // Create stock movement
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            quantityChange: -item.quantity,
            type: "sale",
            fromLocationId: locationId,
            reference: invoiceNumber,
          },
        });
      }

      return invoice;
    });

    return NextResponse.json({
      success: true,
      invoiceNumber: result.invoiceNumber,
      invoiceId: result.id,
      totalUsd: result.totalUsd,
    });
  } catch (error) {
    console.error("Error processing sale:", error);
    return NextResponse.json(
      { error: "Failed to process sale" },
      { status: 500 }
    );
  }
}
