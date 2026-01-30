import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/barcode?code=123456789
// Lookup product variant by barcode
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Barcode is required" },
      { status: 400 }
    );
  }

  try {
    const variant = await prisma.productVariant.findFirst({
      where: {
        OR: [
          { barcode: code },
          { sku: code }, // Also allow lookup by SKU
        ],
      },
      include: {
        product: {
          include: {
            brand: true,
          },
        },
        specification: true,
      },
    });

    if (!variant) {
      return NextResponse.json(
        { error: "Product not found", code },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: variant.id,
      barcode: variant.barcode,
      sku: variant.sku,
      priceUsd: variant.priceUsd,
      stockQuantity: variant.stockQuantity,
      lowStockThreshold: variant.lowStockThreshold,
      product: {
        id: variant.product.id,
        name: variant.product.name,
        description: variant.product.description,
        brand: {
          id: variant.product.brand.id,
          name: variant.product.brand.name,
        },
      },
      specification: {
        id: variant.specification.id,
        label: variant.specification.label,
        value: variant.specification.value,
      },
    });
  } catch (error) {
    console.error("Barcode lookup error:", error);
    return NextResponse.json(
      { error: "Failed to lookup barcode" },
      { status: 500 }
    );
  }
}
