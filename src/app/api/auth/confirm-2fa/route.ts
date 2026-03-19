import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  verifyTOTPCode,
  generateBackupCodes,
  SESSION_COOKIE,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getSession(token);
  if (!session || session.pending2fa) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { secret, code } = await request.json();
  if (!secret || !code) {
    return NextResponse.json({ error: "Secret en code zijn vereist" }, { status: 400 });
  }

  if (!verifyTOTPCode(secret, code)) {
    return NextResponse.json({ error: "Ongeldige code — probeer opnieuw" }, { status: 400 });
  }

  const { plain, hashed } = await generateBackupCodes();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFAEnabled: true,
      twoFASecret: secret,
      backupCodes: JSON.stringify(hashed),
    },
  });

  return NextResponse.json({ backupCodes: plain });
}
