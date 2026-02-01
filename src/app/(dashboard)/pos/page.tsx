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

export default async function POSPage() {
  const [exchangeRate, locations, customers] = await Promise.all([
    getExchangeRate(),
    getLocations(),
    getCustomers(),
  ]);

  return (
    <div className="h-[calc(100vh-6rem)]">
      <POSClient
        exchangeRate={exchangeRate}
        locations={locations}
        customers={customers}
      />
    </div>
  );
}
