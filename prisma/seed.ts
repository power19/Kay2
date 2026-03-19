import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create default specifications for electronics
  const specifications = [
    { value: "64GB", label: "64GB Storage", sortOrder: 1 },
    { value: "128GB", label: "128GB Storage", sortOrder: 2 },
    { value: "256GB", label: "256GB Storage", sortOrder: 3 },
    { value: "512GB", label: "512GB Storage", sortOrder: 4 },
    { value: "1TB", label: "1TB Storage", sortOrder: 5 },
    { value: "Black", label: "Black", sortOrder: 10 },
    { value: "White", label: "White", sortOrder: 11 },
    { value: "Silver", label: "Silver", sortOrder: 12 },
    { value: "Gold", label: "Gold", sortOrder: 13 },
  ];

  for (const spec of specifications) {
    await prisma.specification.upsert({
      where: { label: spec.label },
      update: {},
      create: spec,
    });
  }
  console.log("Created default specifications");

  // Create initial exchange rate
  const existingRate = await prisma.exchangeRate.findFirst({
    where: { isCurrent: true },
  });

  if (!existingRate) {
    await prisma.exchangeRate.create({
      data: {
        rateUsdToSrd: parseFloat(process.env.DEFAULT_EXCHANGE_RATE || "1.0"),
        isCurrent: true,
      },
    });
    console.log("Created initial exchange rate");
  }

  // Create default storage locations
  const locations = [
    { name: "Storage Rack A", type: "storage", sortOrder: 1 },
    { name: "Storage Rack B", type: "storage", sortOrder: 2 },
    { name: "Main Display", type: "display", sortOrder: 1 },
  ];

  for (const location of locations) {
    await prisma.storageLocation.upsert({
      where: { name: location.name },
      update: {},
      create: location,
    });
  }
  console.log("Created default storage locations");

  // Create default admin user
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@invman.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: { name: "Administrator", email: adminEmail, passwordHash, role: "admin" },
    });
    console.log(`Created admin user: ${adminEmail}`);
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
