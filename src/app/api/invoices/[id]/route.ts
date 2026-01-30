import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        quote: true,
        items: {
          include: {
            variant: {
              include: {
                product: { include: { brand: true } },
                literVariation: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
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
    const { status, notes, dueDate, paidDate } = body;

    const updateData: {
      status?: string;
      notes?: string | null;
      dueDate?: Date | null;
      paidDate?: Date | null;
    } = {};

    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes || null;
    if (dueDate !== undefined)
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (paidDate !== undefined)
      updateData.paidDate = paidDate ? new Date(paidDate) : null;

    // If marking as paid, set paidDate if not provided
    if (status === "paid" && !paidDate) {
      updateData.paidDate = new Date();
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        items: {
          include: {
            variant: {
              include: {
                product: { include: { brand: true } },
                literVariation: true,
              },
            },
          },
        },
      },
    });

    // If marked as paid, deduct from inventory
    if (status === "paid") {
      for (const item of invoice.items) {
        await prisma.$transaction([
          prisma.productVariant.update({
            where: { id: item.variantId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          }),
          prisma.stockMovement.create({
            data: {
              variantId: item.variantId,
              quantityChange: -item.quantity,
              type: "sale",
              reference: invoice.invoiceNumber,
              notes: `Sold via invoice ${invoice.invoiceNumber}`,
            },
          }),
        ]);
      }
    }

    return NextResponse.json(invoice);
  } catch (error: unknown) {
    console.error("Error updating invoice:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to update invoice" },
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

    // Check if invoice is paid - don't allow deletion of paid invoices
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Cannot delete paid invoices" },
        { status: 400 }
      );
    }

    await prisma.invoice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
