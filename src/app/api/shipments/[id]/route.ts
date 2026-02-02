import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const shipment = await prisma.shipment.findUnique({
      where: { id },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(shipment);
  } catch (error) {
    console.error("Error fetching shipment:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipment" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      description,
      supplier,
      arrivalDate,
      inklaarKosten,
      shippingKosten,
      overmakingsKosten,
      overigeKosten,
      notes,
      status,
    } = body;

    const shipment = await prisma.shipment.update({
      where: { id },
      data: {
        description: description || null,
        supplier: supplier || null,
        arrivalDate: arrivalDate ? new Date(arrivalDate) : undefined,
        inklaarKosten: inklaarKosten !== undefined ? parseFloat(inklaarKosten) : undefined,
        shippingKosten: shippingKosten !== undefined ? parseFloat(shippingKosten) : undefined,
        overmakingsKosten: overmakingsKosten !== undefined ? parseFloat(overmakingsKosten) : undefined,
        overigeKosten: overigeKosten !== undefined ? parseFloat(overigeKosten) : undefined,
        notes: notes !== undefined ? notes || null : undefined,
        status: status || undefined,
      },
    });

    return NextResponse.json(shipment);
  } catch (error) {
    console.error("Error updating shipment:", error);
    return NextResponse.json(
      { error: "Failed to update shipment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.shipment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shipment:", error);
    return NextResponse.json(
      { error: "Failed to delete shipment" },
      { status: 500 }
    );
  }
}
