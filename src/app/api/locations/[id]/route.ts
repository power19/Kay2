import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const location = await prisma.storageLocation.findUnique({
      where: { id },
      include: {
        variantStock: {
          include: {
            variant: {
              include: {
                product: {
                  include: { brand: true },
                },
                specification: true,
              },
            },
          },
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(location);
  } catch (error) {
    console.error("Error fetching location:", error);
    return NextResponse.json(
      { error: "Failed to fetch location" },
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
    const { name, type, description, sortOrder } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      );
    }

    const location = await prisma.storageLocation.update({
      where: { id },
      data: {
        name: name.trim(),
        type: type || "storage",
        description: description || null,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(location);
  } catch (error: unknown) {
    console.error("Error updating location:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A location with this name already exists" },
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
        { error: "Location not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update location" },
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

    // Check if any stock exists at this location
    const stockCount = await prisma.variantLocation.aggregate({
      where: { locationId: id },
      _sum: { quantity: true },
    });

    if (stockCount._sum.quantity && stockCount._sum.quantity > 0) {
      return NextResponse.json(
        { error: `Cannot delete. This location has ${stockCount._sum.quantity} items. Transfer them first.` },
        { status: 400 }
      );
    }

    await prisma.storageLocation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting location:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 }
    );
  }
}
