# Gestión de paquetes con Helm

## Conceptos centrales

- **Chart:** Paquete Helm con definiciones de recursos K8s
- **Repository:** Colección de charts
- **Release:** Instancia desplegada de un chart
- **Values:** Configuración que parametriza los charts

## Estructura del chart

```
mychart/
├── Chart.yaml              # Metadata
├── values.yaml             # Default values
├── charts/                 # Dependencies
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── _helpers.tpl       # Template helpers
│   └── NOTES.txt
└── values.schema.json     # Validation (optional)
```

## Comandos esenciales

```bash
helm create mychart           # Create chart
helm lint mychart             # Validate
helm template myrelease ./mychart  # Render locally
helm install myrelease ./mychart --dry-run --debug  # Preview

helm install myrelease ./mychart
helm install myrelease ./mychart -f values-prod.yaml
helm install myrelease ./mychart --set replicaCount=3

helm upgrade myrelease ./mychart
helm rollback myrelease 1
helm list
helm uninstall myrelease
```

## Multi-entorno

```bash
# Files: values.yaml, values-dev.yaml, values-prod.yaml
helm install myapp ./mychart -f values.yaml -f values-prod.yaml
helm install myapp ./mychart --set replicaCount=3 --set image.tag=v1.2.3
```

## Ejemplo de values.yaml

```yaml
replicaCount: 2
image:
  repository: myapp
  tag: "1.0.0"
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 8080
resources:
  limits: { cpu: 500m, memory: 512Mi }
  requests: { cpu: 250m, memory: 256Mi }
```

## Dependencias

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.1.0"
    repository: "https://charts.bitnami.com/bitnami"
```

```bash
helm dependency update mychart
```

Consulta `kubernetes-helm-advanced.md` para templates, hooks y empaquetado.
