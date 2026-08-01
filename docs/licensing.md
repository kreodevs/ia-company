# Licencia y modelo comercial

## Resumen

**Auto Company Platform** se distribuye bajo **[GNU Affero General Public License v3.0 (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html)**.

| Uso | Permitido | Notas |
|-----|-----------|-------|
| **Self-host** (tu VPS, tu empresa) | Sí | Gratis. Respeta aislamiento de datos y claves LLM propias. |
| **Modificar el código** | Sí | Si ofreces el software a terceros vía red (SaaS), debes publicar el código modificado (cláusula AGPL). |
| **Instalación gestionada** (Kreo u otro integrador) | Sí | El cliente opera su instancia; el integrador puede cobrar setup/soporte. |
| **Oficina alquilada** (multi-tenant en instancia Kreo) | Sí | Producto comercial en [ia-company](https://github.com/kreodevs/ia-company) / dominio hosted — no requiere self-host. |
| **SaaS competidor closed-source** | No sin licencia | Fork + hosted sin abrir cambios viola AGPL; contactar para licencia comercial. |

## Por qué AGPL y no MIT

El proyecto nació como herramienta personal para operar una empresa con agentes IA y generar ingresos en paralelo a otro empleo. El modelo de negocio es dual:

1. **Comunidad open source** — quien quiera control total instala en su VPS (Docker Compose / Dokploy) sin pagar licencia de software.
2. **Solopreneurs y equipos pequeños** — alquilan su oficina virtual en la instancia multi-tenant operada por Kreo Devs (sin administrar infra).

Con **MIT**, cualquier actor podría clonar el repo y lanzar un SaaS competidor sin contribuir nada. **AGPL-3.0** mantiene el código abierto y exige transparencia a quien ofrezca el producto como servicio en red, alineado con GitLab, Cal.com, Twenty CRM y otros productos “open core / self-host + cloud”.

## Self-host

```bash
git clone https://github.com/kreodevs/ia-company.git
cp .env.example .env
docker compose up -d   # o Dokploy — ver docker/README.md
```

- Eres responsable de PostgreSQL, Redis, backups, claves LLM y dominio.
- Puedes contratar instalación one-shot en VPS (servicio de consultoría; no es licencia de software adicional).
- Si modificas el código **solo para uso interno** sin dar acceso a terceros externos, las obligaciones AGPL se limitan a las de GPL v3 habituales sobre distribución.

## Instancia hosted (oficina alquilada)

La instancia multi-tenant operada por **Kreo Devs** es el producto comercial: tenant aislado, límites de coste, soporte, actualizaciones. No necesitas clonar el repo.

Contacto comercial: ver README / sitio del proyecto.

## Licencia comercial (dual licensing)

**Kreo Devs** es titular del copyright y puede ofrecer **licencias comerciales** a organizaciones que:

- Quieran operar un SaaS basado en este código **sin** publicar modificaciones bajo AGPL, o
- Necesiten términos enterprise (SLA, indemnización, marca).

Para licencias comerciales: abrir issue privado o contacto en el repositorio.

## Atribución al proyecto original

Esta plataforma está inspirada en [Auto Company](https://github.com/MaxMiksa/Auto-Company) (MIT). El motor multi-tenant, Office-first, worker y UI son desarrollo de Kreo Devs.

## Resumen legal (no sustituye asesoría)

- **AGPL-3.0** = software libre con copyleft fuerte en servicios en red.
- **Self-host** = libertad + responsabilidad operativa.
- **Hosted Kreo** = conveniencia multi-tenant de pago.
- **Competencia SaaS closed-source** = requiere licencia comercial o cumplir AGPL.

Texto completo: [`LICENSE`](../LICENSE) en la raíz del repositorio.
