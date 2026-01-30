import { prisma } from "@/lib/prisma";
import { LiterVariationsClient } from "./liter-variations-client";

export const dynamic = "force-dynamic";

async function getLiterVariations() {
  return prisma.literVariation.findMany({
    orderBy: { sizeInLiters: "asc" },
    include: {
      _count: {
        select: { productVariants: true },
      },
    },
  });
}

export default async function LiterVariationsPage() {
  const variations = await getLiterVariations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Liter Variations</h1>
        <p className="text-muted-foreground">
          Define the different container sizes for your oil products
        </p>
      </div>
      <LiterVariationsClient initialVariations={variations} />
    </div>
  );
}
