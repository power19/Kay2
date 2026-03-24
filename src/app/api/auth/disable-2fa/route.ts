import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  verifyTOTPCode,
  verifyBackupCode,
  SESSION_COOKIE,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getSession(token);
  if (!session || session.pending2fa) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code, isBackup } = await request.json();
  const user = session.user;

  if (!user.twoFASecret) {
    return NextResponse.json({ error: "2FA is niet ingeschakeld" }, { status: 400 });
  }

  let valid = false;
  if (isBackup) {
    const storedCodes: string[] = JSON.parse(user.backupCodes || "[]");
    valid = (await verifyBackupCode(code, storedCodes)) >= 0;
  } else {
    valid = verifyTOTPCode(user.twoFASecret, code);
  }

  if (!valid) {
    return NextResponse.json({ error: "Ongeldige code" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFAEnabled: false, twoFASecret: null, backupCodes: null },
  });

  return NextResponse.json({ ok: true });
}
