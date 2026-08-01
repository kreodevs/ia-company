import { prisma } from "./prisma.js";

export interface TenantDeliveryBrandingDto {
  tenantId: string;
  tenantName: string;
  logoUrl: string | null;
  primaryColor: string;
  footerText: string | null;
  confidentialityNotice: string | null;
  contactEmail: string | null;
}

const DEFAULTS = {
  primaryColor: "#2563eb",
};

export async function getTenantDeliveryBranding(
  tenantId: string,
): Promise<TenantDeliveryBrandingDto> {
  const [row, tenant] = await Promise.all([
    prisma.tenantDeliveryBranding.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ]);
  return {
    tenantId,
    tenantName: tenant?.name ?? "",
    logoUrl: row?.logoUrl ?? null,
    primaryColor: row?.primaryColor ?? DEFAULTS.primaryColor,
    footerText: row?.footerText ?? (tenant ? `Entrega preparada por ${tenant.name}` : null),
    confidentialityNotice: row?.confidentialityNotice ?? null,
    contactEmail: row?.contactEmail ?? null,
  };
}

export async function upsertTenantDeliveryBranding(
  tenantId: string,
  input: Partial<Omit<TenantDeliveryBrandingDto, "tenantId" | "tenantName">>,
): Promise<TenantDeliveryBrandingDto> {
  const row = await prisma.tenantDeliveryBranding.upsert({
    where: { tenantId },
    update: {
      logoUrl: input.logoUrl === undefined ? undefined : input.logoUrl,
      primaryColor: input.primaryColor?.trim() || DEFAULTS.primaryColor,
      footerText: input.footerText === undefined ? undefined : input.footerText,
      confidentialityNotice:
        input.confidentialityNotice === undefined ? undefined : input.confidentialityNotice,
      contactEmail: input.contactEmail === undefined ? undefined : input.contactEmail,
    },
    create: {
      tenantId,
      logoUrl: input.logoUrl ?? null,
      primaryColor: input.primaryColor?.trim() || DEFAULTS.primaryColor,
      footerText: input.footerText ?? null,
      confidentialityNotice: input.confidentialityNotice ?? null,
      contactEmail: input.contactEmail ?? null,
    },
  });
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  return {
    tenantId: row.tenantId,
    tenantName: tenant?.name ?? "",
    logoUrl: row.logoUrl,
    primaryColor: row.primaryColor,
    footerText: row.footerText,
    confidentialityNotice: row.confidentialityNotice,
    contactEmail: row.contactEmail,
  };
}
