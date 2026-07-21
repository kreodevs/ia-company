import bcrypt from "bcryptjs";

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "ac_session";
export const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE_SEC ?? 60 * 60 * 24 * 7);

export type AuthKind = "superadmin" | "tenant";
export type TenantUserRole = "owner" | "admin" | "member";

export interface SessionPayload {
  kind: AuthKind;
  sub: string;
  email: string;
  name: string;
  /** Home tenant for tenant users */
  tenantId: string | null;
  tenantSlug?: string | null;
  tenantRole?: TenantUserRole;
  /** Superadmin impersonation target */
  impersonatedTenantId: string | null;
}

export function resolveEffectiveTenantId(session: SessionPayload | null): string | null {
  if (!session) return null;
  if (session.kind === "tenant") return session.tenantId;
  return session.impersonatedTenantId ?? null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function isTenantAdmin(session: SessionPayload): boolean {
  return session.kind === "tenant" && (session.tenantRole === "owner" || session.tenantRole === "admin");
}

export function isSuperAdmin(session: SessionPayload): boolean {
  return session.kind === "superadmin";
}
