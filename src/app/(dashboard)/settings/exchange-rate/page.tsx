import { prisma } from "@/lib/prisma";
import { ExchangeRateClient } from "./exchange-rate-client";

export const dynamic = "force-dynamic";

async function getExchangeRateData() {
  const currentRate = await prisma.exchangeRate.findFirst({
    where: { isCurrent: true },
  });

  const history = await prisma.exchangeRate.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Serialize dates for client component
  const serializeRate = (rate: typeof currentRate) =>
    rate
      ? {
          ...rate,
          effectiveDate: rate.effectiveDate.toISOString(),
          createdAt: rate.createdAt.toISOString(),
        }
      : null;

  return {
    current: serializeRate(currentRate),
    history: history.map((rate) => ({
      ...rate,
      effectiveDate: rate.effectiveDate.toISOString(),
      createdAt: rate.createdAt.toISOString(),
    })),
  };
}

export default async function ExchangeRatePage() {
  const data = await getExchangeRateData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exchange Rate</h1>
        <p className="text-muted-foreground">
          Manage the USD to SRD exchange rate for price display
        </p>
      </div>
      <ExchangeRateClient
        currentRate={data.current}
        history={data.history}
      />
    </div>
  );
}
