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
          literVariation: true,
        },
        orderBy: {
          literVariation: { sizeInLiters: "asc" },
        },
      },
    },
  });
}

async function getLiterVariations() {
  return prisma.literVariation.findMany({
    orderBy: { sizeInLiters: "asc" },
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
  const [product, literVariations, exchangeRate] = await Promise.all([
    getProduct(id),
    getLiterVariations(),
    getExchangeRate(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ProductDetailClient
        product={product}
        literVariations={literVariations}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}
