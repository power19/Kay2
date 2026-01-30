import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Max file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("logo") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 2MB" },
        { status: 400 }
      );
    }

    // Convert to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Get or create company info
    let company = await prisma.companyInfo.findFirst();

    if (company) {
      company = await prisma.companyInfo.update({
        where: { id: company.id },
        data: { logo: dataUrl },
      });
    } else {
      company = await prisma.companyInfo.create({
        data: {
          name: "InvMan",
          logo: dataUrl,
        },
      });
    }

    return NextResponse.json({ logo: company.logo });
  } catch (error) {
    console.error("Error uploading logo:", error);
    return NextResponse.json(
      { error: "Failed to upload logo" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const company = await prisma.companyInfo.findFirst();

    if (company) {
      await prisma.companyInfo.update({
        where: { id: company.id },
        data: { logo: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting logo:", error);
    return NextResponse.json(
      { error: "Failed to delete logo" },
      { status: 500 }
    );
  }
}
