import { prisma } from "@/lib/prisma";
import { ReceivingClient } from "./receiving-client";

export const dynamic = "force-dynamic";

async function getVariants() {
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
    },
  });
}

async function getLocations() {
  return prisma.storageLocation.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });
}

export default async function ReceivingPage() {
  const [variants, locations] = await Promise.all([
    getVariants(),
    getLocations(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Receive Goods</h1>
        <p className="text-muted-foreground">
          Scan items as they arrive, then allocate to storage locations
        </p>
      </div>
      <ReceivingClient variants={variants} locations={locations} />
    </div>
  );
}
