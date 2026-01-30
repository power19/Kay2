import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
) {
  try {
    const { variantId } = await params;
    const body = await request.json();
    const { quantityChange, type, reference, notes } = body;

    if (typeof quantityChange !== "number" || quantityChange === 0) {
      return NextResponse.json(
        { error: "Quantity change must be a non-zero number" },
        { status: 400 }
      );
    }

    if (!type || !["purchase", "sale", "adjustment", "return"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid movement type" },
        { status: 400 }
      );
    }

    // Get current stock
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      return NextResponse.json(
        { error: "Product variant not found" },
        { status: 404 }
      );
    }

    const newQuantity = variant.stockQuantity + quantityChange;
    if (newQuantity < 0) {
      return NextResponse.json(
        { error: "Stock cannot be negative" },
        { status: 400 }
      );
    }

    // Update stock and create movement record
    const [updatedVariant, movement] = await prisma.$transaction([
      prisma.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity: newQuantity },
        include: {
          product: {
            include: { brand: true },
          },
          literVariation: true,
        },
      }),
      prisma.stockMovement.create({
        data: {
          variantId,
          quantityChange,
          type,
          reference: reference || null,
          notes: notes || null,
        },
      }),
    ]);

    return NextResponse.json({ variant: updatedVariant, movement });
  } catch (error) {
    console.error("Error adjusting stock:", error);
    return NextResponse.json(
      { error: "Failed to adjust stock" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
) {
  try {
    const { variantId } = await params;

    const movements = await prisma.stockMovement.findMany({
      where: { variantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error("Error fetching stock movements:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock movements" },
      { status: 500 }
    );
  }
}
