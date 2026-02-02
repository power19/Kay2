import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { formatSrd } from "@/lib/currency";
import { InvoiceActions } from "./invoice-actions";
import { PrintButton } from "@/components/shared/print-button";

async function getInvoice(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      quote: true,
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
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-orange-100 text-orange-800",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, company] = await Promise.all([
    getInvoice(id),
    getCompanyInfo(),
  ]);

  if (!invoice) {
    notFound();
  }

  const totalSrd = invoice.totalUsd * invoice.exchangeRate;
  const invoiceNumber = invoice.invoiceNumber.replace(/[^0-9]/g, '') || invoice.invoiceNumber;
  const currency = invoice.displayCurrency || "SRD";
  const isUsd = currency === "USD";
  const invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  const pdfTitle = `Invoice-${invoice.invoiceNumber}-${invoiceDate}`;

  // Format helpers based on display currency
  const formatPrice = (usdAmount: number) => {
    if (isUsd) {
      return `USD ${usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `SRD ${(usdAmount * invoice.exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header controls - hide on print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
              <Badge className={statusColors[invoice.status]}>
                {invoice.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton documentTitle={pdfTitle} />
          <InvoiceActions invoice={invoice} />
        </div>
      </div>

      {/* Printable Invoice */}
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
          <h2 className="text-4xl font-bold text-[#1e3a5f]">INVOICE</h2>
        </div>

        {/* Bill To and Invoice Info */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          {/* Bill To */}
          <div>
            <div className="bg-[#1e3a5f] text-white px-3 py-1 text-sm font-semibold mb-2">
              BILL TO
            </div>
            <div className="text-sm">
              <p className="font-medium">{invoice.customer.companyName || invoice.customer.name}</p>
              {invoice.customer.address && (
                <p className="text-gray-600 whitespace-pre-line">{invoice.customer.address}</p>
              )}
            </div>
          </div>

          {/* Invoice Details */}
          <div>
            <div className="grid grid-cols-2 border border-gray-300">
              <div className="bg-[#1e3a5f] text-white px-3 py-1 text-sm font-semibold">
                INVOICE #
              </div>
              <div className="bg-[#1e3a5f] text-white px-3 py-1 text-sm font-semibold">
                DATE
              </div>
              <div className="px-3 py-1 text-sm border-t border-gray-300">
                {invoiceNumber}
              </div>
              <div className="px-3 py-1 text-sm border-t border-l border-gray-300">
                {new Date(invoice.invoiceDate).toLocaleDateString()}
              </div>
            </div>
            <div className="grid grid-cols-2 border border-t-0 border-gray-300 mt-2">
              <div className="bg-[#1e3a5f] text-white px-3 py-1 text-sm font-semibold">
                CUSTOMER ID
              </div>
              <div className="bg-[#1e3a5f] text-white px-3 py-1 text-sm font-semibold">
                TERMS
              </div>
              <div className="px-3 py-1 text-sm border-t border-gray-300">
                {invoice.customer.customerCode || "-"}
              </div>
              <div className="px-3 py-1 text-sm border-t border-l border-gray-300">
                {invoice.paymentTerms || "CASH/BANK"}
              </div>
            </div>
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
            {invoice.items.map((item, index) => {
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
            {Array.from({ length: Math.max(0, 8 - invoice.items.length) }).map((_, i) => (
              <tr key={`empty-${i}`} className={((invoice.items.length + i) % 2 === 0) ? "bg-gray-50" : ""}>
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
            <p className="text-blue-600 italic text-sm">Thank you for your business!</p>

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
              <span>{formatPrice(invoice.subtotalUsd)}</span>
            </div>

            {invoice.discountUsd > 0 && (
              <div className="flex justify-between text-sm border-b pb-2">
                <span>DISCOUNT {invoice.discountPercent > 0 ? `(${invoice.discountPercent}%)` : ''}</span>
                <span>-{formatPrice(invoice.discountUsd)}</span>
              </div>
            )}

            {invoice.taxRate > 0 && (
              <div className="flex justify-between text-sm border-b pb-2">
                <span>BTW ({invoice.taxRate}%)</span>
                <span>{formatPrice(invoice.taxAmountUsd)}</span>
              </div>
            )}

            {/* Total Box */}
            <div className="bg-[#1e3a5f] text-white flex items-center mt-4">
              <div className="px-4 py-3 font-bold text-lg">TOTAL</div>
              <div className="px-4 py-3 font-bold text-lg">{currency}</div>
              <div className="px-4 py-3 font-bold text-lg flex-1 text-right">
                {isUsd
                  ? invoice.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : totalSrd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <p className="text-red-600 font-semibold text-center mt-4">
                NOTE: {invoice.notes.toUpperCase()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
