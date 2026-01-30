import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { value, label, sortOrder } = body;

    if (!label || typeof label !== "string" || label.trim() === "") {
      return NextResponse.json(
        { error: "Label is required" },
        { status: 400 }
      );
    }

    const specification = await prisma.specification.update({
      where: { id },
      data: {
        value: value || "",
        label: label.trim(),
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(specification);
  } catch (error: unknown) {
    console.error("Error updating specification:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A specification with this label already exists" },
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
        { error: "Specification not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update specification" },
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

    // Check if any product variants use this specification
    const usageCount = await prisma.productVariant.count({
      where: { specificationId: id },
    });

    if (usageCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete. This specification is used by ${usageCount} product variant(s).` },
        { status: 400 }
      );
    }

    await prisma.specification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting specification:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Specification not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete specification" },
      { status: 500 }
    );
  }
}
