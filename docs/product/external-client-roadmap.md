# Roadmap — Cliente externo 10/10

> Actualizado tras Sprint G + H — 2026-08-01

---

## Puntuación actual

| Dimensión | Antes | Ahora |
|-----------|-------|-------|
| Funcionalidad core | 7/10 | **9/10** |
| Confianza / marca | 4/10 | **8/10** |
| Control | 6/10 | **9/10** |
| Distribución | 3/10 | **8/10** |
| Seguridad / compliance | 5/10 | **7/10** |
| Experiencia móvil | 6/10 | **8/10** |

**Global “listo para cliente externo”:** ~**8.5/10** (Sprint G+H completados)

---

## Sprint G — Presentable ✅

- [x] Branding tenant en `/d/:token` (`TenantDeliveryBranding`, Settings → Entrega cliente)
- [x] Picker de documentos + caducidad (7d / 30d / 90d / nunca)
- [x] Envío por email (Resend) desde panel de encargo
- [x] Audit: `firstViewedAt`, `viewCount`, notificación `delivery_viewed`
- [x] Snapshot inmutable al crear enlace (`contentSnapshot`)
- [x] Confirmación legal antes de compartir
- [x] Rotar token (nuevo enlace, reset views)

---

## Sprint H — Profesional ✅

- [x] Export HTML imprimible → PDF vía navegador (`/export.html?print=1`)
- [x] Export Markdown (`/export.md`)
- [x] Vista previa antes de compartir (`DeliveryPreviewModal`)
- [x] Rate limit en rutas públicas (40 req/min)
- [x] `X-Robots-Tag: noindex` + meta robots en página
- [x] Open Graph (title, description, image)
- [x] TOC + toolbar + mobile polish en página pública
- [x] Aviso de confidencialidad configurable

---

## Pendiente para 10/10 absoluto

### Seguridad
- [ ] Contraseña / PIN opcional en enlace
- [ ] Audit log exportable (CSV) de vistas
- [ ] Retención automática post-revocación

### Formato
- [ ] PDF server-side (sin depender del print del browser)
- [ ] ZIP con assets referenciados en markdown
- [ ] Anexos estáticos (PDF upload)

### Distribución
- [ ] QR code en panel
- [ ] Webhook al crear/revocar
- [ ] Plantillas de email editables con variables

### Marca
- [ ] Favicon por tenant en entrega pública
- [ ] Open Graph image generada (no solo logo URL)

---

## Referencias técnicas

| Área | Archivos |
|------|----------|
| Modelo | `EncargoDelivery`, `TenantDeliveryBranding` |
| API pública | `src/server/routes/public-delivery.ts` |
| Lógica | `src/lib/encargo-delivery.ts`, `delivery-export.ts` |
| Branding | `src/lib/tenant-delivery-branding.ts` |
| UI tenant | `EncargoDeliveryPanel`, `DeliveryPreviewModal` |
| UI pública | `PublicDeliveryPage` |
| Settings | `TenantDeliveryBrandingPanel` → `/settings?tab=delivery` |
