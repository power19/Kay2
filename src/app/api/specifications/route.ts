import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const specifications = await prisma.specification.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { productVariants: true },
        },
      },
    });
    return NextResponse.json(specifications);
  } catch (error) {
    console.error("Error fetching specifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch specifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { value, label, sortOrder } = body;

    if (!label || typeof label !== "string" || label.trim() === "") {
      return NextResponse.json(
        { error: "Label is required" },
        { status: 400 }
      );
    }

    const specification = await prisma.specification.create({
      data: {
        value: value || "",
        label: label.trim(),
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(specification, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating specification:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A specification with this label already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create specification" },
      { status: 500 }
    );
  }
}
