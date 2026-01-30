import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type ReceivingItem = {
  variantId: string;
  quantity: number;
  locationId: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, reference, notes } = body as {
      items: ReceivingItem[];
      reference?: string;
      notes?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No items to receive" },
        { status: 400 }
      );
    }

    // Validate all items have required fields
    for (const item of items) {
      if (!item.variantId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Each item must have a variantId and positive quantity" },
          { status: 400 }
        );
      }
      if (!item.locationId) {
        return NextResponse.json(
          { error: "Each item must have a locationId" },
          { status: 400 }
        );
      }
    }

    // Verify all variants exist
    const variantIds = items.map((item) => item.variantId);
    const existingVariants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true },
    });

    if (existingVariants.length !== variantIds.length) {
      return NextResponse.json(
        { error: "One or more product variants not found" },
        { status: 404 }
      );
    }

    // Verify all locations exist
    const locationIds = [...new Set(items.map((item) => item.locationId))];
    const existingLocations = await prisma.storageLocation.findMany({
      where: { id: { in: locationIds } },
      select: { id: true },
    });

    if (existingLocations.length !== locationIds.length) {
      return NextResponse.json(
        { error: "One or more storage locations not found" },
        { status: 404 }
      );
    }

    // Build all database operations
    const operations: any[] = [];

    for (const item of items) {
      // Update total stock quantity on variant
      operations.push(
        prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { increment: item.quantity } },
        })
      );

      // Upsert location stock
      operations.push(
        prisma.variantLocation.upsert({
          where: {
            variantId_locationId: {
              variantId: item.variantId,
              locationId: item.locationId,
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            variantId: item.variantId,
            locationId: item.locationId,
            quantity: item.quantity,
          },
        })
      );

      // Create stock movement record
      operations.push(
        prisma.stockMovement.create({
          data: {
            variantId: item.variantId,
            quantityChange: item.quantity,
            type: "purchase",
            toLocationId: item.locationId,
            reference: reference || null,
            notes: notes || null,
          },
        })
      );
    }

    // Execute all operations in a transaction
    await prisma.$transaction(operations);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return NextResponse.json({
      success: true,
      totalItems,
      itemCount: items.length,
    });
  } catch (error) {
    console.error("Error receiving goods:", error);
    return NextResponse.json(
      { error: "Failed to receive goods" },
      { status: 500 }
    );
  }
}
