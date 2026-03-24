import { NextRequest, NextResponse } from "next/server";
import { getSession, generateTOTPSecret, getTOTPUri, SESSION_COOKIE } from "@/lib/auth";
import QRCode from "qrcode";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getSession(token);
  if (!session || session.pending2fa) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = generateTOTPSecret();
  const uri = getTOTPUri(secret, session.user.email);
  const qrCodeDataUrl = await QRCode.toDataURL(uri);

  return NextResponse.json({ secret, qrCodeDataUrl });
}
