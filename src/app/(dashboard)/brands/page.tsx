import { prisma } from "@/lib/prisma";
import { BrandsClient } from "./brands-client";

export const dynamic = "force-dynamic";

async function getBrands() {
  try {
    return await prisma.brand.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return [];
  }
}

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Brands</h1>
      </div>
      <BrandsClient initialBrands={brands} />
    </div>
  );
}
