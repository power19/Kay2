import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  verifyPassword,
  createSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  PENDING_2FA_COOKIE_OPTIONS,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "E-mail en wachtwoord zijn vereist" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Onjuist e-mailadres of wachtwoord" }, { status: 401 });
    }

    if (user.twoFAEnabled) {
      const token = await createSession(user.id, true);
      const response = NextResponse.json({ requires2fa: true });
      response.cookies.set(SESSION_COOKIE, token, PENDING_2FA_COOKIE_OPTIONS);
      return response;
    }

    const token = await createSession(user.id, false);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Interne fout" }, { status: 500 });
  }
}
