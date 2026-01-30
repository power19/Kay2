import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const variations = await prisma.literVariation.findMany({
      orderBy: { sizeInLiters: "asc" },
      include: {
        _count: {
          select: { productVariants: true },
        },
      },
    });
    return NextResponse.json(variations);
  } catch (error) {
    console.error("Error fetching liter variations:", error);
    return NextResponse.json(
      { error: "Failed to fetch liter variations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const variation = await prisma.literVariation.create({
      data: {
        sizeInLiters,
        label: label.trim(),
        isDrum: isDrum || false,
      },
    });

    return NextResponse.json(variation, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating liter variation:", error);
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
    return NextResponse.json(
      { error: "Failed to create liter variation" },
      { status: 500 }
    );
  }
}
