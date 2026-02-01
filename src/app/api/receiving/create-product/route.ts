import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      barcode,
      brandId,
      newBrandName,
      productName,
      specificationId,
      newSpecLabel,
      newSpecValue,
      costPriceUsd,
      priceUsd,
    } = body;

    // Validate required fields
    if (!barcode) {
      return NextResponse.json(
        { error: "Barcode is required" },
        { status: 400 }
      );
    }

    if (!brandId && !newBrandName) {
      return NextResponse.json(
        { error: "Brand is required" },
        { status: 400 }
      );
    }

    if (!productName) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    if (!specificationId && (!newSpecLabel || !newSpecValue)) {
      return NextResponse.json(
        { error: "Specification is required" },
        { status: 400 }
      );
    }

    if (priceUsd === undefined || priceUsd < 0) {
      return NextResponse.json(
        { error: "Valid sell price is required" },
        { status: 400 }
      );
    }

    // Check if barcode already exists
    const existingVariant = await prisma.productVariant.findFirst({
      where: { barcode },
    });

    if (existingVariant) {
      return NextResponse.json(
        { error: "A product with this barcode already exists" },
        { status: 400 }
      );
    }

    // Get or create brand
    let finalBrandId = brandId;
    if (!brandId && newBrandName) {
      const existingBrand = await prisma.brand.findFirst({
        where: { name: newBrandName },
      });

      if (existingBrand) {
        finalBrandId = existingBrand.id;
      } else {
        const newBrand = await prisma.brand.create({
          data: { name: newBrandName },
        });
        finalBrandId = newBrand.id;
      }
    }

    // Get or create specification
    let finalSpecificationId = specificationId;
    if (!specificationId && newSpecLabel && newSpecValue) {
      const existingSpec = await prisma.specification.findFirst({
        where: { label: newSpecLabel },
      });

      if (existingSpec) {
        finalSpecificationId = existingSpec.id;
      } else {
        // Get max sort order
        const maxSortOrder = await prisma.specification.aggregate({
          _max: { sortOrder: true },
        });
        const newSpec = await prisma.specification.create({
          data: {
            label: newSpecLabel,
            value: newSpecValue,
            sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
          },
        });
        finalSpecificationId = newSpec.id;
      }
    }

    // Check if product with same name exists for this brand
    let product = await prisma.product.findFirst({
      where: {
        name: productName,
        brandId: finalBrandId,
      },
    });

    if (!product) {
      // Create the product
      product = await prisma.product.create({
        data: {
          name: productName,
          brandId: finalBrandId,
        },
      });
    }

    // Check if variant with same specification exists for this product
    const existingVariantForSpec = await prisma.productVariant.findFirst({
      where: {
        productId: product.id,
        specificationId: finalSpecificationId,
      },
    });

    if (existingVariantForSpec) {
      return NextResponse.json(
        { error: "A variant with this specification already exists for this product" },
        { status: 400 }
      );
    }

    // Create the variant
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        specificationId: finalSpecificationId,
        barcode,
        costPriceUsd: costPriceUsd || 0,
        priceUsd,
        stockQuantity: 0,
        lowStockThreshold: 10,
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

    return NextResponse.json({
      success: true,
      variant: {
        id: variant.id,
        barcode: variant.barcode,
        sku: variant.sku,
        costPriceUsd: variant.costPriceUsd,
        priceUsd: variant.priceUsd,
        stockQuantity: variant.stockQuantity,
        product: {
          id: variant.product.id,
          name: variant.product.name,
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
      },
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
