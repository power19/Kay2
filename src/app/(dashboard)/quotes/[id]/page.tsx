import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { QuoteActions } from "./quote-actions";
import { PrintButton } from "@/components/shared/print-button";

async function getQuote(id: string) {
  return prisma.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          variant: {
            include: {
              product: { include: { brand: true } },
              specification: true,
            },
          },
        },
      },
    },
  });
}

async function getCompanyInfo() {
  let company = await prisma.companyInfo.findFirst();
  if (!company) {
    company = await prisma.companyInfo.create({
      data: {
        name: "Black Water Distribution",
        address: "Doekhie weg west #69\nParamaribo",
        phone: "(597) 8819128",
        bankName: "Fina bank",
        bankAccUsd: "1001556149",
        bankAccSrd: "1001556138",
        bankAccEur: "1001556157",
      },
    });
  }
  return company;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-orange-100 text-orange-800",
};

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [quote, company] = await Promise.all([
    getQuote(id),
    getCompanyInfo(),
  ]);

  if (!quote) {
    notFound();
  }

  const totalSrd = quote.totalUsd * quote.exchangeRate;
  const quoteNumber = quote.quoteNumber.replace(/[^0-9]/g, '') || quote.quoteNumber;
  const currency = quote.displayCurrency || "SRD";
  const isUsd = currency === "USD";
  const quoteDate = new Date(quote.quoteDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  const pdfTitle = `Quote-${quote.quoteNumber}-${quoteDate}`;

  // Format helpers based on display currency
  const formatPrice = (usdAmount: number) => {
    if (isUsd) {
      return `USD ${usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `SRD ${(usdAmount * quote.exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header controls - hide on print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/quotes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
              <Badge className={statusColors[quote.status]}>
                {quote.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton documentTitle={pdfTitle} />
          <QuoteActions quote={quote} />
        </div>
      </div>

      {/* Printable Quote */}
      <div className="bg-white p-8 border rounded-lg print:border-0 print:p-0 print:shadow-none max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
            {company.address && (
              <p className="text-sm text-gray-600 whitespace-pre-line">{company.address}</p>
            )}
            {company.phone && (
              <p className="text-sm text-gray-600">Phone: {company.phone}</p>
            )}
          </div>
          <h2 className="text-4xl font-bold text-[#1e3a5f]">QUOTE</h2>
        </div>

        {/* Bill To and Quote Info */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          {/* Bill To */}
          <div>
            <div className="bg-[#1e3a5f] text-white px-3 py-1 text-sm font-semibold mb-2">
              QUOTE FOR
            </div>
            <div className="text-sm">
              <p className="font-medium">{quote.customer.companyName || quote.customer.name}</p>
              {quote.customer.address && (
                <p className="text-gray-600 whitespace-pre-line">{quote.customer.address}</p>
              )}
            </div>
          </div>

          {/* Quote Details */}
          <div>
            <div className="grid grid-cols-2 border border-gray-300">
              <div className="bg-[#1e3a5f] text-white px-3 py-1 text-sm font-semibold">
                QUOTE #
              </div>
              <div className="bg-[#1e3a5f] text-white px-3 py-1 text-sm font-semibold">
                DATE
              </div>
              <div className="px-3 py-1 text-sm border-t border-gray-300">
                {quoteNumber}
              </div>
              <div className="px-3 py-1 text-sm border-t border-l border-gray-300">
                {new Date(quote.quoteDate).toLocaleDateString()}
              </div>
            </div>
            {quote.validUntil && (
              <div className="grid grid-cols-2 border border-t-0 border-gray-300 mt-2">
                <div className="bg-[#1e3a5f] text-white px-3 py-1 text-sm font-semibold">
                  VALID UNTIL
                </div>
                <div className="bg-[#1e3a5f] text-white px-3 py-1 text-sm font-semibold">
                  EXCHANGE RATE
                </div>
                <div className="px-3 py-1 text-sm border-t border-gray-300">
                  {new Date(quote.validUntil).toLocaleDateString()}
                </div>
                <div className="px-3 py-1 text-sm border-t border-l border-gray-300">
                  $1 = SRD {quote.exchangeRate.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="bg-[#1e3a5f] text-white">
              <th className="px-3 py-2 text-left font-semibold">DESCRIPTION</th>
              <th className="px-3 py-2 text-center font-semibold w-20">QTY</th>
              <th className="px-3 py-2 text-right font-semibold w-32">UNIT PRICE</th>
              <th className="px-3 py-2 text-right font-semibold w-32">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, index) => {
              const lineTotal = item.quantity * item.unitPriceUsd;
              return (
                <tr key={item.id} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="px-3 py-2 border-b border-gray-200">
                    {item.variant.product.brand.name} - {item.variant.product.name} ({item.variant.specification.label})
                  </td>
                  <td className="px-3 py-2 text-center border-b border-gray-200">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-2 text-right border-b border-gray-200">
                    {formatPrice(item.unitPriceUsd)}
                  </td>
                  <td className="px-3 py-2 text-right border-b border-gray-200">
                    {formatPrice(lineTotal)}
                  </td>
                </tr>
              );
            })}
            {/* Empty rows for visual consistency */}
            {Array.from({ length: Math.max(0, 8 - quote.items.length) }).map((_, i) => (
              <tr key={`empty-${i}`} className={((quote.items.length + i) % 2 === 0) ? "bg-gray-50" : ""}>
                <td className="px-3 py-2 border-b border-gray-200">&nbsp;</td>
                <td className="px-3 py-2 border-b border-gray-200"></td>
                <td className="px-3 py-2 border-b border-gray-200"></td>
                <td className="px-3 py-2 border-b border-gray-200"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer Section */}
        <div className="grid grid-cols-2 gap-8">
          {/* Left side - Thank you and Bank details */}
          <div className="space-y-4">
            <p className="text-blue-600 italic text-sm">Thank you for your interest!</p>

            <div className="text-sm">
              <p className="font-semibold">BANK: {company.bankName}</p>
              <p>Name: {company.name?.toUpperCase()}</p>
              {company.bankAccUsd && <p>USD: {company.bankAccUsd}</p>}
              {company.bankAccSrd && <p>SRD: {company.bankAccSrd}</p>}
              {company.bankAccEur && <p>EUR: {company.bankAccEur}</p>}
              {company.finnNumber && <p className="mt-2">Fin #: {company.finnNumber}</p>}
            </div>
          </div>

          {/* Right side - Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm border-b pb-2">
              <span>SUBTOTAL</span>
              <span>{formatPrice(quote.subtotalUsd)}</span>
            </div>

            {/* Total Box */}
            <div className="bg-[#1e3a5f] text-white flex items-center mt-4">
              <div className="px-4 py-3 font-bold text-lg">TOTAL</div>
              <div className="px-4 py-3 font-bold text-lg">{currency}</div>
              <div className="px-4 py-3 font-bold text-lg flex-1 text-right">
                {isUsd
                  ? quote.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : totalSrd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <p className="text-gray-600 text-sm mt-4">
                Note: {quote.notes}
              </p>
            )}
          </div>
        </div>

        {/* Validity Notice */}
        {quote.validUntil && (
          <div className="mt-6 text-center text-sm text-gray-500 border-t pt-4">
            This quote is valid until {new Date(quote.validUntil).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
