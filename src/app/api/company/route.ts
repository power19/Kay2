import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    let company = await prisma.companyInfo.findFirst();

    // Create default if not exists
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

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching company info:", error);
    return NextResponse.json(
      { error: "Failed to fetch company info" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { name, address, phone, bankName, bankAccUsd, bankAccSrd, bankAccEur } = body;

    let company = await prisma.companyInfo.findFirst();

    if (company) {
      company = await prisma.companyInfo.update({
        where: { id: company.id },
        data: { name, address, phone, bankName, bankAccUsd, bankAccSrd, bankAccEur },
      });
    } else {
      company = await prisma.companyInfo.create({
        data: { name, address, phone, bankName, bankAccUsd, bankAccSrd, bankAccEur },
      });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error updating company info:", error);
    return NextResponse.json(
      { error: "Failed to update company info" },
      { status: 500 }
    );
  }
}
