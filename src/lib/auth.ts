import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { generateSecret, generateSync, verifySync, generateURI } from "otplib";

// ── Passwords ────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── Sessions ─────────────────────────────────────────────────────────────────

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function createSession(userId: string, pending2fa = false) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + (pending2fa ? 5 * 60 * 1000 : SESSION_DURATION_MS));
  await prisma.session.create({ data: { token, userId, expiresAt, pending2fa } });
  return token;
}

export async function getSession(token: string) {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { token } });
    return null;
  }
  return session;
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

// ── TOTP 2FA ─────────────────────────────────────────────────────────────────

export function generateTOTPSecret(): string {
  return generateSecret();
}

export function getTOTPUri(secret: string, email: string): string {
  return generateURI({ label: email, issuer: "Invman", secret, type: "totp" });
}

export function verifyTOTPCode(secret: string, code: string): boolean {
  const result = verifySync({ token: code, secret });
  return result !== false && result.valid === true;
}

// ── Backup Codes ─────────────────────────────────────────────────────────────

export async function generateBackupCodes(): Promise<{ plain: string[]; hashed: string[] }> {
  const plain: string[] = Array.from({ length: 8 }, () =>
    randomBytes(4).toString("hex").toUpperCase()
  );
  const hashed = await Promise.all(plain.map((c) => bcrypt.hash(c, 10)));
  return { plain, hashed };
}

export async function verifyBackupCode(code: string, hashedCodes: string[]): Promise<number> {
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await bcrypt.compare(code.toUpperCase().replace(/-/g, ""), hashedCodes[i])) {
      return i;
    }
  }
  return -1;
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

export { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, PENDING_2FA_COOKIE_OPTIONS } from "@/lib/cookies";
