import { prisma } from "@/lib/prisma";
import { ShipmentsClient } from "./shipments-client";

async function getShipments() {
  return prisma.shipment.findMany({
    orderBy: { arrivalDate: "desc" },
  });
}

export default async function ShipmentsPage() {
  const shipments = await getShipments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shipments</h1>
        <p className="text-muted-foreground">
          Track costs for each shipment
        </p>
      </div>
      <ShipmentsClient shipments={shipments} />
    </div>
  );
}
