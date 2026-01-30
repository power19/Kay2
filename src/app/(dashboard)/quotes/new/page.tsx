import { prisma } from "@/lib/prisma";
import { QuoteForm } from "../quote-form";

export const dynamic = "force-dynamic";

async function getCustomers() {
  return prisma.customer.findMany({
    orderBy: { name: "asc" },
  });
}

async function getProductVariants() {
  return prisma.productVariant.findMany({
    orderBy: [
      { product: { brand: { name: "asc" } } },
      { product: { name: "asc" } },
      { specification: { sortOrder: "asc" } },
    ],
    include: {
      product: {
        include: { brand: true },
      },
      specification: true,
    },
  });
}

async function getExchangeRate() {
  const rate = await prisma.exchangeRate.findFirst({
    where: { isCurrent: true },
  });
  return rate?.rateUsdToSrd ?? 0;
}

export default async function NewQuotePage() {
  const [customers, variants, exchangeRate] = await Promise.all([
    getCustomers(),
    getProductVariants(),
    getExchangeRate(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create New Quote</h1>
      <QuoteForm
        customers={customers}
        variants={variants}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}
