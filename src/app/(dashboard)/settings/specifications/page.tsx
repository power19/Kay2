import { prisma } from "@/lib/prisma";
import { SpecificationsClient } from "./specifications-client";

export const dynamic = "force-dynamic";

async function getSpecifications() {
  return prisma.specification.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { productVariants: true },
      },
    },
  });
}

export default async function SpecificationsPage() {
  const specifications = await getSpecifications();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Specifications</h1>
        <p className="text-muted-foreground">
          Define product specifications like storage size, color, or other variants
        </p>
      </div>
      <SpecificationsClient initialSpecifications={specifications} />
    </div>
  );
}
