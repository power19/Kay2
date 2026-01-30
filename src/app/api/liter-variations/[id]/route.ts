import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sizeInLiters, label, isDrum } = body;

    if (!label || typeof label !== "string" || label.trim() === "") {
      return NextResponse.json(
        { error: "Label is required" },
        { status: 400 }
      );
    }

    if (typeof sizeInLiters !== "number" || sizeInLiters <= 0) {
      return NextResponse.json(
        { error: "Size in liters must be a positive number" },
        { status: 400 }
      );
    }

    const variation = await prisma.literVariation.update({
      where: { id },
      data: {
        sizeInLiters,
        label: label.trim(),
        isDrum: isDrum || false,
      },
    });

    return NextResponse.json(variation);
  } catch (error: unknown) {
    console.error("Error updating liter variation:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A liter variation with this label already exists" },
        { status: 400 }
      );
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Liter variation not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update liter variation" },
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

    // Check if any product variants use this liter variation
    const usageCount = await prisma.productVariant.count({
      where: { literVariationId: id },
    });

    if (usageCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete. This liter size is used by ${usageCount} product variant(s).` },
        { status: 400 }
      );
    }

    await prisma.literVariation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting liter variation:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Liter variation not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete liter variation" },
      { status: 500 }
    );
  }
}
