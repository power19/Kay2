import { prisma } from "@/lib/prisma";
import { ReceivingClient } from "./receiving-client";

export const dynamic = "force-dynamic";

async function getLocations() {
  return prisma.storageLocation.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
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

export default async function ReceivingPage() {
  const [locations, brands, specifications] = await Promise.all([
    getLocations(),
    getBrands(),
    getSpecifications(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Receive Goods</h1>
        <p className="text-muted-foreground">
          Scan items as they arrive, then allocate to storage locations
        </p>
      </div>
      <ReceivingClient
        locations={locations}
        brands={brands}
        specifications={specifications}
      />
    </div>
  );
}
