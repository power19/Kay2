import { prisma } from "@/lib/prisma";
import { InventoryClient } from "./inventory-client";

export const dynamic = "force-dynamic";

async function getInventory() {
  return prisma.productVariant.findMany({
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
      locationStock: {
        include: {
          location: true,
        },
      },
    },
  });
}

async function getLocations() {
  return prisma.storageLocation.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });
}

async function getExchangeRate() {
  const rate = await prisma.exchangeRate.findFirst({
    where: { isCurrent: true },
  });
  return rate?.rateUsdToSrd ?? 0;
}

export default async function InventoryPage() {
  const [inventory, exchangeRate, locations] = await Promise.all([
    getInventory(),
    getExchangeRate(),
    getLocations(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-muted-foreground">
          Track and manage stock levels for all products
        </p>
      </div>
      <InventoryClient inventory={inventory} exchangeRate={exchangeRate} locations={locations} />
    </div>
  );
}
