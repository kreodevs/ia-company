---
name: security-audit
agents: [yokay-security-scanner]
description: Usar al revisar seguridad de código, auditar dependencias por CVEs, verificar seguridad de configuración o secretos, evaluar patrones de autenticación y autorización, identificar vulnerabilidades OWASP (inyección, XSS, CSRF), o abordar preocupaciones de seguridad sobre implementaciones.
---

# Auditoría de seguridad

Revisión sistemática de seguridad para código de aplicación, dependencias y configuración.

**No reemplaza pruebas de penetración profesionales.** Identifica vulnerabilidades comunes dentro del alcance de una revisión de código.

## Tipos de auditoría

| Tipo | Enfoque | Cuándo usar |
|------|---------|-------------|
| Revisión de código | OWASP Top 10, inyección, auth | Nuevas features, PRs, código sospechoso |
| Dependencias | CVEs, paquetes desactualizados | Antes de deploy, periódico, CI/CD |
| Configuración | Secretos, permisos, hardening | Cambios de infraestructura, nuevos entornos |
| Arquitectura | Superficie de ataque, flujo de datos | Fase de diseño, refactors mayores |
| Seguridad API | Auth, authz, rate limiting | Nuevos endpoints, APIs públicas |

## Cuándo NO usar

- **Diseñar nuevos flujos de auth** — Usar `api-design` para diseñar endpoints OAuth2/JWT desde cero
- **Problemas de rendimiento** — Usar `performance-optimization` aunque la causa sea overhead de auth
- **Seguridad de pipeline CI/CD** — Usar `ci-cd` para hardening de pipelines (gestión de secretos, permisos)

## Principios clave

- **Alcance primero** — Define área, profundidad y restricciones de la auditoría antes de escanear
- **Clasificar severidad** — Crítico (24-48h), Alto (1 semana), Medio (2-4 semanas), Bajo (backlog)
- **Remediar o registrar** — Corregir issues críticos de inmediato, crear tareas ohno para el resto
- **Sin secretos en código** — Escanear credenciales hardcodeadas, API keys, connection strings

## Checklist de inicio rápido

1. Definir alcance y tipo de auditoría (código, dependencias, config, arquitectura, API)
2. Ejecutar escaneos automatizados (npm audit, patrones grep, detección de secretos)
3. Revisar hallazgos y clasificar severidad usando el árbol de decisión en referencias
4. Remediar hallazgos críticos/altos de inmediato
5. Crear tareas ohno para hallazgos medio/bajos con prioridad apropiada
6. Documentar hallazgos en informe de auditoría

## Referencias

| Referencia | Descripción |
|-----------|-------------|
| [owasp-top-10.md](references/owasp-top-10.md) | Vulnerabilidades OWASP con detección y correcciones |
| [dependency-security.md](references/dependency-security.md) | npm audit, pip-audit, Snyk, integración CI/CD |
| [auth-patterns.md](references/auth-patterns.md) | Patrones seguros de autenticación y autorización |
| [api-security.md](references/api-security.md) | Preocupaciones de seguridad específicas de API |
| [secrets-management.md](references/secrets-management.md) | Manejo de configuración sensible |