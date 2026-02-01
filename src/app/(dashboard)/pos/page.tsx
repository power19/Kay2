import { prisma } from "@/lib/prisma";
import { POSClient } from "./pos-client";

export const dynamic = "force-dynamic";

async function getExchangeRate() {
  const rate = await prisma.exchangeRate.findFirst({
    where: { isCurrent: true },
    orderBy: { effectiveDate: "desc" },
  });
  return rate?.rateUsdToSrd ?? 1;
}

async function getLocations() {
  return prisma.storageLocation.findMany({
    where: { type: "display" },
    orderBy: { sortOrder: "asc" },
  });
}

async function getCustomers() {
  return prisma.customer.findMany({
    orderBy: { name: "asc" },
    take: 100,
  });
}

async function getProducts() {
  return prisma.productVariant.findMany({
    where: { stockQuantity: { gt: 0 } },
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
}

export default async function POSPage() {
  const [exchangeRate, locations, customers, products] = await Promise.all([
    getExchangeRate(),
    getLocations(),
    getCustomers(),
    getProducts(),
  ]);

  return (
    <div className="h-[calc(100vh-6rem)]">
      <POSClient
        exchangeRate={exchangeRate}
        locations={locations}
        customers={customers}
        products={products}
      />
    </div>
  );
}
