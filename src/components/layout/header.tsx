import { prisma } from "@/lib/prisma";
import { formatSrd } from "@/lib/currency";

async function getCurrentExchangeRate() {
  const rate = await prisma.exchangeRate.findFirst({
    where: { isCurrent: true },
  });
  return rate?.rateUsdToSrd ?? 0;
}

export async function Header() {
  const exchangeRate = await getCurrentExchangeRate();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="rounded-md bg-blue-50 px-3 py-1.5 text-sm">
          <span className="text-gray-600">Exchange Rate: </span>
          <span className="font-semibold text-blue-700">
            $1 = {formatSrd(exchangeRate)}
          </span>
        </div>
      </div>
    </header>
  );
}
