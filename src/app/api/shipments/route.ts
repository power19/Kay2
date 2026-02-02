import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function generateShipmentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const lastShipment = await prisma.shipment.findFirst({
    where: { shipmentNumber: { startsWith: `SHP-${year}-` } },
    orderBy: { createdAt: "desc" },
  });

  const sequence = lastShipment
    ? parseInt(lastShipment.shipmentNumber.split("-")[2]) + 1
    : 1;

  return `SHP-${year}-${sequence.toString().padStart(4, "0")}`;
}

export async function GET() {
  try {
    const shipments = await prisma.shipment.findMany({
      orderBy: { arrivalDate: "desc" },
    });
    return NextResponse.json(shipments);
  } catch (error) {
    console.error("Error fetching shipments:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      description,
      supplier,
      arrivalDate,
      inklaarKosten = 0,
      shippingKosten = 0,
      overmakingsKosten = 0,
      overigeKosten = 0,
      notes,
      status = "pending",
    } = body;

    if (!arrivalDate) {
      return NextResponse.json(
        { error: "Arrival date is required" },
        { status: 400 }
      );
    }

    const shipmentNumber = await generateShipmentNumber();

    const shipment = await prisma.shipment.create({
      data: {
        shipmentNumber,
        description: description || null,
        supplier: supplier || null,
        arrivalDate: new Date(arrivalDate),
        inklaarKosten: parseFloat(inklaarKosten) || 0,
        shippingKosten: parseFloat(shippingKosten) || 0,
        overmakingsKosten: parseFloat(overmakingsKosten) || 0,
        overigeKosten: parseFloat(overigeKosten) || 0,
        notes: notes || null,
        status,
      },
    });

    return NextResponse.json(shipment, { status: 201 });
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json(
      { error: "Failed to create shipment" },
      { status: 500 }
    );
  }
}
