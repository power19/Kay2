import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const variants = await prisma.productVariant.findMany({
      orderBy: [
        { product: { brand: { name: "asc" } } },
        { product: { name: "asc" } },
        { specification: { sortOrder: "asc" } },
      ],
      include: {
        product: {
          include: {
            brand: true,
          },
        },
        specification: true,
      },
    });
    return NextResponse.json(variants);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
