import { prisma } from "@/lib/prisma";
import { ProductsClient } from "./products-client";

export const dynamic = "force-dynamic";

async function getProducts() {
  return prisma.product.findMany({
    orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
    include: {
      brand: true,
      variants: {
        include: {
          specification: true,
        },
        orderBy: {
          specification: { sortOrder: "asc" },
        },
      },
    },
  });
}

async function getBrands() {
  return prisma.brand.findMany({
    orderBy: { name: "asc" },
  });
}

async function getSpecifications() {
  return prisma.specification.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

export default async function ProductsPage() {
  const [products, brands, specifications] = await Promise.all([
    getProducts(),
    getBrands(),
    getSpecifications(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
      </div>
      <ProductsClient
        initialProducts={products}
        brands={brands}
        specifications={specifications}
      />
    </div>
  );
}
