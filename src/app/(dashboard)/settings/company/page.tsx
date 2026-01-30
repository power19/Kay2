import { prisma } from "@/lib/prisma";
import { CompanyForm } from "./company-form";

export const dynamic = "force-dynamic";

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

export default async function CompanySettingsPage() {
  const company = await getCompanyInfo();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Information</h1>
        <p className="text-muted-foreground">
          Update your company details for invoices and quotes
        </p>
      </div>
      <CompanyForm company={company} />
    </div>
  );
}
