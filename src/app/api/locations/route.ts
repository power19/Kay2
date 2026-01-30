import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const locations = await prisma.storageLocation.findMany({
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { variantStock: true },
        },
        variantStock: {
          select: {
            quantity: true,
          },
        },
      },
    });

    // Calculate total items at each location
    const locationsWithTotals = locations.map((loc) => ({
      ...loc,
      totalItems: loc.variantStock.reduce((sum, vs) => sum + vs.quantity, 0),
      variantStock: undefined,
    }));

    return NextResponse.json(locationsWithTotals);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, description, sortOrder } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      );
    }

    const location = await prisma.storageLocation.create({
      data: {
        name: name.trim(),
        type: type || "storage",
        description: description || null,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating location:", error);
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
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}
