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
                specification: true,
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

    // If marking as paid, do everything in one transaction
    if (status === "paid") {
      // First check current status to prevent double-pay
      const existing = await prisma.invoice.findUnique({
        where: { id },
        select: { status: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      if (existing.status === "paid") {
        return NextResponse.json(
          { error: "Invoice is already paid" },
          { status: 400 }
        );
      }

      // Get the invoice items first
      const invoiceWithItems = await prisma.invoice.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!invoiceWithItems) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      // Build all operations for a single transaction
      const operations = [
        prisma.invoice.update({
          where: { id },
          data: {
            status: "paid",
            paidDate: paidDate ? new Date(paidDate) : new Date(),
            ...(notes !== undefined ? { notes: notes || null } : {}),
          },
        }),
        // Deduct inventory and create stock movements for each item
        ...invoiceWithItems.items.flatMap((item) => [
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
              reference: invoiceWithItems.invoiceNumber,
              notes: `Sold via invoice ${invoiceWithItems.invoiceNumber}`,
            },
          }),
        ]),
      ];

      await prisma.$transaction(operations);

      // Fetch the updated invoice with full relations for the response
      const updatedInvoice = await prisma.invoice.findUnique({
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

      return NextResponse.json(updatedInvoice);
    }

    // For non-paid status updates
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
                specification: true,
              },
            },
          },
        },
      },
    });

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
