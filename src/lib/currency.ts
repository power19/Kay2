export function convertUsdToSrd(usdAmount: number, exchangeRate: number): number {
  return usdAmount * exchangeRate;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatSrd(amount: number): string {
  // Use custom formatting since SRD isn't well supported in Intl.NumberFormat
  return `SRD ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function formatCurrency(
  usdAmount: number,
  exchangeRate: number,
  showBoth: boolean = true
): { usd: string; srd: string } {
  const srdAmount = convertUsdToSrd(usdAmount, exchangeRate);
  return {
    usd: formatUsd(usdAmount),
    srd: formatSrd(srdAmount),
  };
}
