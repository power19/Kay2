import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ variantId: string }> }
) {
  try {
    const { variantId } = await params;
    const body = await request.json();
    const { quantityChange, type, reference, notes, locationId, toLocationId } = body;

    if (typeof quantityChange !== "number" || quantityChange === 0) {
      return NextResponse.json(
        { error: "Quantity change must be a non-zero number" },
        { status: 400 }
      );
    }

    if (!type || !["purchase", "sale", "adjustment", "return", "transfer"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid movement type" },
        { status: 400 }
      );
    }

    // Get current stock
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        locationStock: true,
      },
    });

    if (!variant) {
      return NextResponse.json(
        { error: "Product variant not found" },
        { status: 404 }
      );
    }

    // Handle transfer between locations
    if (type === "transfer" && locationId && toLocationId) {
      const fromLocationStock = variant.locationStock.find(
        (ls) => ls.locationId === locationId
      );

      if (!fromLocationStock || fromLocationStock.quantity < Math.abs(quantityChange)) {
        return NextResponse.json(
          { error: "Not enough stock at source location" },
          { status: 400 }
        );
      }

      // Perform transfer
      await prisma.$transaction([
        // Decrease from source location
        prisma.variantLocation.update({
          where: { id: fromLocationStock.id },
          data: { quantity: { decrement: Math.abs(quantityChange) } },
        }),
        // Increase at destination location (upsert)
        prisma.variantLocation.upsert({
          where: {
            variantId_locationId: { variantId, locationId: toLocationId },
          },
          update: { quantity: { increment: Math.abs(quantityChange) } },
          create: {
            variantId,
            locationId: toLocationId,
            quantity: Math.abs(quantityChange),
          },
        }),
        // Create movement record
        prisma.stockMovement.create({
          data: {
            variantId,
            quantityChange: Math.abs(quantityChange),
            type: "transfer",
            fromLocationId: locationId,
            toLocationId: toLocationId,
            reference: reference || null,
            notes: notes || null,
          },
        }),
      ]);

      const updatedVariant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: {
          product: { include: { brand: true } },
          specification: true,
          locationStock: { include: { location: true } },
        },
      });

      return NextResponse.json({ variant: updatedVariant, transferred: true });
    }

    // Regular stock adjustment
    const newQuantity = variant.stockQuantity + quantityChange;
    if (newQuantity < 0) {
      return NextResponse.json(
        { error: "Stock cannot be negative" },
        { status: 400 }
      );
    }

    // Build transaction operations
    const operations: any[] = [
      // Update total stock
      prisma.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity: newQuantity },
        include: {
          product: { include: { brand: true } },
          specification: true,
          locationStock: { include: { location: true } },
        },
      }),
    ];

    // If location is specified, also update location stock
    if (locationId) {
      const existingLocationStock = variant.locationStock.find(
        (ls) => ls.locationId === locationId
      );

      if (existingLocationStock) {
        const newLocationQty = existingLocationStock.quantity + quantityChange;
        if (newLocationQty < 0) {
          return NextResponse.json(
            { error: "Location stock cannot be negative" },
            { status: 400 }
          );
        }
        operations.push(
          prisma.variantLocation.update({
            where: { id: existingLocationStock.id },
            data: { quantity: newLocationQty },
          })
        );
      } else if (quantityChange > 0) {
        // Create new location stock entry only for additions
        operations.push(
          prisma.variantLocation.create({
            data: {
              variantId,
              locationId,
              quantity: quantityChange,
            },
          })
        );
      }
    }

    // Add movement record
    operations.push(
      prisma.stockMovement.create({
        data: {
          variantId,
          quantityChange,
          type,
          toLocationId: quantityChange > 0 ? locationId : null,
          fromLocationId: quantityChange < 0 ? locationId : null,
          reference: reference || null,
          notes: notes || null,
        },
      })
    );

    const results = await prisma.$transaction(operations);
    const updatedVariant = results[0];

    return NextResponse.json({ variant: updatedVariant, movement: results[results.length - 1] });
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
      include: {
        fromLocation: true,
        toLocation: true,
      },
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
