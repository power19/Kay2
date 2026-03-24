import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  verifyTOTPCode,
  verifyBackupCode,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Geen actieve sessie" }, { status: 401 });

    const session = await getSession(token);
    if (!session || !session.pending2fa) {
      return NextResponse.json({ error: "Ongeldige of verlopen sessie" }, { status: 401 });
    }

    const { code, isBackup } = await request.json();
    const user = session.user;

    if (!user.twoFASecret) {
      return NextResponse.json({ error: "2FA niet geconfigureerd" }, { status: 400 });
    }

    let valid = false;

    if (isBackup) {
      const storedCodes: string[] = JSON.parse(user.backupCodes || "[]");
      const idx = await verifyBackupCode(code, storedCodes);
      if (idx >= 0) {
        valid = true;
        // Remove used backup code
        storedCodes.splice(idx, 1);
        await prisma.user.update({
          where: { id: user.id },
          data: { backupCodes: JSON.stringify(storedCodes) },
        });
      }
    } else {
      valid = verifyTOTPCode(user.twoFASecret, code);
    }

    if (!valid) {
      return NextResponse.json({ error: "Ongeldige code" }, { status: 401 });
    }

    // Delete pending session and create real session
    await deleteSession(token);
    const newToken = await createSession(user.id, false);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, newToken, SESSION_COOKIE_OPTIONS);
    return response;
  } catch (err) {
    console.error("2FA verify error:", err);
    return NextResponse.json({ error: "Interne fout" }, { status: 500 });
  }
}
