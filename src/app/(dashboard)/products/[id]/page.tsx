import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "./product-detail-client";

async function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
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

async function getSpecifications() {
  return prisma.specification.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

async function getExchangeRate() {
  const rate = await prisma.exchangeRate.findFirst({
    where: { isCurrent: true },
  });
  return rate?.rateUsdToSrd ?? 0;
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, specifications, exchangeRate] = await Promise.all([
    getProduct(id),
    getSpecifications(),
    getExchangeRate(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ProductDetailClient
        product={product}
        specifications={specifications}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}
