import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
      include: {
        brand: true,
        variants: {
          include: {
            specification: true,
          },
        },
      },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, brandId, variants } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    if (!brandId) {
      return NextResponse.json(
        { error: "Brand is required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        brandId,
        variants: variants?.length
          ? {
              create: variants.map(
                (v: { specificationId: string; priceUsd: number; sku?: string }) => ({
                  specificationId: v.specificationId,
                  priceUsd: v.priceUsd,
                  sku: v.sku || null,
                  stockQuantity: 0,
                })
              ),
            }
          : undefined,
      },
      include: {
        brand: true,
        variants: {
          include: {
            specification: true,
          },
        },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating product:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A product with this name already exists for this brand" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
