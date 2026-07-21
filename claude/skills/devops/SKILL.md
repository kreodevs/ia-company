---
name: devops
description: Deploy en Cloudflare (Workers, R2, D1), Docker, GCP (Cloud Run, GKE), Kubernetes (kubectl, Helm). Usar para serverless, contenedores, CI/CD, GitOps, auditoría de seguridad.
license: MIT
version: 2.0.0
---

# Skill DevOps

Despliega y gestiona infraestructura cloud en Cloudflare, Docker, Google Cloud y Kubernetes.

## Cuándo usar

- Desplegar apps serverless en Cloudflare Workers/Pages
- Containerizar apps con Docker, Docker Compose
- Gestionar GCP con gcloud CLI (Cloud Run, GKE, Cloud SQL)
- Gestión de clusters Kubernetes (kubectl, Helm)
- Workflows GitOps (Argo CD, Flux)
- Pipelines CI/CD, despliegues multi-región
- Auditorías de seguridad, RBAC, network policies

## Selección de plataforma

| Necesidad | Elegir |
|------|--------|
| Latencia sub-50ms globalmente | Cloudflare Workers |
| Almacenamiento de archivos grandes (egress cero) | Cloudflare R2 |
| Base de datos SQL (lecturas globales) | Cloudflare D1 |
| Workloads containerizados | Docker + Cloud Run/GKE |
| Kubernetes empresarial | GKE |
| Base de datos relacional gestionada | Cloud SQL |
| Sitio estático + API | Cloudflare Pages |
| Orquestación de contenedores | Kubernetes |
| Gestión de paquetes para K8s | Helm |

## Inicio rápido

```bash
# Cloudflare Worker
wrangler init my-worker && cd my-worker && wrangler deploy

# Docker
docker build -t myapp . && docker run -p 3000:3000 myapp

# GCP Cloud Run
gcloud run deploy my-service --image gcr.io/project/image --region us-central1

# Kubernetes
kubectl apply -f manifests/ && kubectl get pods
```

## Navegación de referencias

### Plataforma Cloudflare
- `cloudflare-platform.md` - Visión general de edge computing
- `cloudflare-workers-basics.md` - Tipos de handler, patrones
- `cloudflare-workers-advanced.md` - Rendimiento, optimización
- `cloudflare-workers-apis.md` - Runtime APIs, bindings
- `cloudflare-r2-storage.md` - Object storage, compatibilidad S3
- `cloudflare-d1-kv.md` - D1 SQLite, KV store
- `browser-rendering.md` - Automatización con Puppeteer

### Docker
- `docker-basics.md` - Dockerfile, imágenes, contenedores
- `docker-compose.md` - Apps multi-contenedor

### Google Cloud
- `gcloud-platform.md` - gcloud CLI, autenticación
- `gcloud-services.md` - Compute Engine, GKE, Cloud Run

### Kubernetes
- `kubernetes-basics.md` - Conceptos core, arquitectura, workloads
- `kubernetes-kubectl.md` - Comandos esenciales, flujo de debugging
- `kubernetes-helm.md` / `kubernetes-helm-advanced.md` - Helm charts, templates
- `kubernetes-security.md` / `kubernetes-security-advanced.md` - RBAC, secrets
- `kubernetes-workflows.md` / `kubernetes-workflows-advanced.md` - GitOps, CI/CD
- `kubernetes-troubleshooting.md` / `kubernetes-troubleshooting-advanced.md` - Debug

### Scripts
- `scripts/cloudflare-deploy.py` - Automatizar despliegues de Workers
- `scripts/docker-optimize.py` - Analizar Dockerfiles

## Mejores prácticas

**Seguridad:** Contenedores non-root, RBAC, secrets en env vars, escaneo de imágenes
**Rendimiento:** Builds multi-stage, edge caching, límites de recursos
**Costo:** R2 para egress grande, caching, dimensionar recursos correctamente
**Desarrollo:** Docker Compose en local, wrangler dev, versionar IaC

## Recursos

- Cloudflare: https://developers.cloudflare.com
- Docker: https://docs.docker.com
- GCP: https://cloud.google.com/docs
- Kubernetes: https://kubernetes.io/docs
- Helm: https://helm.sh/docs
