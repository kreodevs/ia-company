import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";
import { hashPassword } from "./auth.js";
import { sendPasswordResetEmail } from "./email.js";

const RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(tenantSlug: string, email: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug.trim().toLowerCase() },
  });
  if (!tenant) return;

  const user = await prisma.tenantUser.findUnique({
    where: {
      tenantId_email: { tenantId: tenant.id, email: email.trim().toLowerCase() },
    },
  });
  if (!user || !user.isActive) return;

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.passwordResetToken.deleteMany({ where: { tenantUserId: user.id } });
  await prisma.passwordResetToken.create({
    data: { tenantUserId: user.id, tokenHash, expiresAt },
  });

  const publicUrl = process.env.PUBLIC_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:5173";
  const resetUrl = `${publicUrl.replace(/\/$/, "")}/reset-password?token=${token}`;

  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
    tenantName: tenant.name,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[password-reset] ${user.email} → ${resetUrl}`);
  }
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { tenantUser: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new Error("Invalid or expired reset token");
  }

  await prisma.tenantUser.update({
    where: { id: record.tenantUserId },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
}
