import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const body = await request.json();
    const { literVariationId, priceUsd, sku, barcode, stockQuantity, lowStockThreshold } = body;

    if (!literVariationId) {
      return NextResponse.json(
        { error: "Liter variation is required" },
        { status: 400 }
      );
    }

    if (typeof priceUsd !== "number" || priceUsd < 0) {
      return NextResponse.json(
        { error: "Price must be a non-negative number" },
        { status: 400 }
      );
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        literVariationId,
        priceUsd,
        sku: sku || null,
        barcode: barcode || null,
        stockQuantity: stockQuantity || 0,
        lowStockThreshold: lowStockThreshold || 10,
      },
      include: {
        literVariation: true,
        product: {
          include: { brand: true },
        },
      },
    });

    return NextResponse.json(variant, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating variant:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This product already has a variant with this liter size" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create variant" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { variantId, priceUsd, sku, barcode, lowStockThreshold } = body;

    if (!variantId) {
      return NextResponse.json(
        { error: "Variant ID is required" },
        { status: 400 }
      );
    }

    if (typeof priceUsd !== "number" || priceUsd < 0) {
      return NextResponse.json(
        { error: "Price must be a non-negative number" },
        { status: 400 }
      );
    }

    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        priceUsd,
        sku: sku || null,
        barcode: barcode || null,
        lowStockThreshold: lowStockThreshold || 10,
      },
      include: {
        literVariation: true,
      },
    });

    return NextResponse.json(variant);
  } catch (error: unknown) {
    console.error("Error updating variant:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to update variant" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get("variantId");

    if (!variantId) {
      return NextResponse.json(
        { error: "Variant ID is required" },
        { status: 400 }
      );
    }

    // Check if variant is used in any quotes or invoices
    const usageCount = await prisma.quoteItem.count({
      where: { variantId },
    });
    const invoiceUsage = await prisma.invoiceItem.count({
      where: { variantId },
    });

    if (usageCount > 0 || invoiceUsage > 0) {
      return NextResponse.json(
        { error: "Cannot delete. This variant is used in quotes or invoices." },
        { status: 400 }
      );
    }

    await prisma.productVariant.delete({
      where: { id: variantId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting variant:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to delete variant" },
      { status: 500 }
    );
  }
}
