import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quote = await prisma.quote.findUnique({
      where: { id },
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

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Error fetching quote:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, validUntil, items } = body;

    const updateData: {
      status?: string;
      notes?: string | null;
      validUntil?: Date | null;
      subtotalUsd?: number;
      totalUsd?: number;
    } = {};

    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes || null;
    if (validUntil !== undefined)
      updateData.validUntil = validUntil ? new Date(validUntil) : null;

    // If items are provided, recalculate totals and update items
    if (items && Array.isArray(items)) {
      const subtotalUsd = items.reduce(
        (sum: number, item: { quantity: number; unitPriceUsd: number }) =>
          sum + item.quantity * item.unitPriceUsd,
        0
      );
      updateData.subtotalUsd = subtotalUsd;
      updateData.totalUsd = subtotalUsd;

      // Delete existing items and create new ones
      await prisma.quoteItem.deleteMany({ where: { quoteId: id } });
      await prisma.quoteItem.createMany({
        data: items.map(
          (item: { variantId: string; quantity: number; unitPriceUsd: number }) => ({
            quoteId: id,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPriceUsd: item.unitPriceUsd,
          })
        ),
      });
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(quote);
  } catch (error: unknown) {
    console.error("Error updating quote:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to update quote" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.quote.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting quote:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to delete quote" },
      { status: 500 }
    );
  }
}
