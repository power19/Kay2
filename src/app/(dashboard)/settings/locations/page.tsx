import { prisma } from "@/lib/prisma";
import { LocationsClient } from "./locations-client";

export const dynamic = "force-dynamic";

async function getLocations() {
  const locations = await prisma.storageLocation.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { variantStock: true },
      },
      variantStock: {
        select: {
          quantity: true,
        },
      },
    },
  });

  return locations.map((loc) => ({
    ...loc,
    totalItems: loc.variantStock.reduce((sum, vs) => sum + vs.quantity, 0),
    variantStock: undefined,
  }));
}

export default async function LocationsPage() {
  const locations = await getLocations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Storage Locations</h1>
        <p className="text-muted-foreground">
          Manage your racks, shelves, and display areas
        </p>
      </div>
      <LocationsClient initialLocations={locations} />
    </div>
  );
}
