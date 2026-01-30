import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const currentRate = await prisma.exchangeRate.findFirst({
      where: { isCurrent: true },
    });

    const history = await prisma.exchangeRate.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ current: currentRate, history });
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rate" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rateUsdToSrd } = body;

    if (typeof rateUsdToSrd !== "number" || rateUsdToSrd <= 0) {
      return NextResponse.json(
        { error: "Exchange rate must be a positive number" },
        { status: 400 }
      );
    }

    // Set all existing rates as not current
    await prisma.exchangeRate.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });

    // Create new current rate
    const newRate = await prisma.exchangeRate.create({
      data: {
        rateUsdToSrd,
        isCurrent: true,
      },
    });

    return NextResponse.json(newRate, { status: 201 });
  } catch (error) {
    console.error("Error updating exchange rate:", error);
    return NextResponse.json(
      { error: "Failed to update exchange rate" },
      { status: 500 }
    );
  }
}
