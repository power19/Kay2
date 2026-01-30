import { prisma } from "@/lib/prisma";
import { InventoryClient } from "./inventory-client";

export const dynamic = "force-dynamic";

async function getInventory() {
  return prisma.productVariant.findMany({
    orderBy: [
      { product: { brand: { name: "asc" } } },
      { product: { name: "asc" } },
      { literVariation: { sizeInLiters: "asc" } },
    ],
    include: {
      product: {
        include: {
          brand: true,
        },
      },
      literVariation: true,
    },
  });
}

async function getExchangeRate() {
  const rate = await prisma.exchangeRate.findFirst({
    where: { isCurrent: true },
  });
  return rate?.rateUsdToSrd ?? 0;
}

export default async function InventoryPage() {
  const [inventory, exchangeRate] = await Promise.all([
    getInventory(),
    getExchangeRate(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-muted-foreground">
          Track and manage stock levels for all products
        </p>
      </div>
      <InventoryClient inventory={inventory} exchangeRate={exchangeRate} />
    </div>
  );
}
