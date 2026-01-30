import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create default liter variations
  const literVariations = [
    { sizeInLiters: 1, label: "1L", isDrum: false },
    { sizeInLiters: 4, label: "4L", isDrum: false },
    { sizeInLiters: 5, label: "5L", isDrum: false },
    { sizeInLiters: 10, label: "10L", isDrum: false },
    { sizeInLiters: 20, label: "20L", isDrum: false },
    { sizeInLiters: 25, label: "25L", isDrum: false },
    { sizeInLiters: 60, label: "60L Drum", isDrum: true },
    { sizeInLiters: 200, label: "200L Drum", isDrum: true },
  ];

  for (const variation of literVariations) {
    await prisma.literVariation.upsert({
      where: { label: variation.label },
      update: {},
      create: variation,
    });
  }
  console.log("Created default liter variations");

  // Create initial exchange rate
  const existingRate = await prisma.exchangeRate.findFirst({
    where: { isCurrent: true },
  });

  if (!existingRate) {
    await prisma.exchangeRate.create({
      data: {
        rateUsdToSrd: parseFloat(process.env.DEFAULT_EXCHANGE_RATE || "35.5"),
        isCurrent: true,
      },
    });
    console.log("Created initial exchange rate");
  }

  console.log("Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
