# Google Cloud Platform con la CLI de gcloud

Guía completa para gcloud CLI: interfaz de línea de comandos para Google Cloud Platform.

## Instalación

###Linux
```bash
curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz
tar -xf google-cloud-cli-linux-x86_64.tar.gz
./google-cloud-sdk/install.sh
./google-cloud-sdk/bin/gcloud init
```

###Debian/Ubuntu
```bash
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
sudo apt-get update && sudo apt-get install google-cloud-cli
```

### MacOS
```bash
curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-darwin-arm.tar.gz
tar -xf google-cloud-cli-darwin-arm.tar.gz
./google-cloud-sdk/install.sh
```

## Autenticación

### Cuenta de usuario
```bash
# Login with browser
gcloud auth login

# Login without browser (remote/headless)
gcloud auth login --no-browser

# List accounts
gcloud auth list

# Switch account
gcloud config set account user@example.com
```

### Cuenta de servicio
```bash
# Activate with key file
gcloud auth activate-service-account SA_EMAIL --key-file=key.json

# Create service account
gcloud iam service-accounts create SA_NAME \
  --display-name="Service Account"

# Create key
gcloud iam service-accounts keys create key.json \
  --iam-account=SA_EMAIL

# Grant role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SA_EMAIL" \
  --role="roles/compute.admin"
```

### Suplantación de cuenta de servicio (recomendado)
```bash
# Impersonate for single command
gcloud compute instances list \
  --impersonate-service-account=SA_EMAIL

# Set default impersonation
gcloud config set auth/impersonate_service_account SA_EMAIL

# Clear impersonation
gcloud config unset auth/impersonate_service_account
```

¿Por qué suplantación de identidad? Credenciales de corta duración, sin archivos clave, gestión centralizada.

## Gestión de configuración

### Configuraciones con nombre
```bash
# Create configuration
gcloud config configurations create dev

# List configurations
gcloud config configurations list

# Activate configuration
gcloud config configurations activate dev

# Set properties
gcloud config set project my-project-dev
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a

# View properties
gcloud config list

# Delete configuration
gcloud config configurations delete dev
```

### Patrón multiambiente
```bash
# Desarrollo
gcloud config configurations create dev
gcloud config set project my-project-dev
gcloud config set account dev@example.com

# Staging
gcloud config configurations create staging
gcloud config set project my-project-staging
gcloud config set auth/impersonate_service_account staging-sa@project.iam.gserviceaccount.com

# Production
gcloud config configurations create prod
gcloud config set project my-project-prod
gcloud config set auth/impersonate_service_account prod-sa@project.iam.gserviceaccount.com
```

## Gestión de proyectos

```bash
# List projects
gcloud projects list

# Create project
gcloud projects create PROJECT_ID --name="Project Name"

# Set active project
gcloud config set project PROJECT_ID

# Get current project
gcloud config get-value project

# Enable API
gcloud services enable compute.googleapis.com
gcloud services enable container.googleapis.com

# List enabled APIs
gcloud services list
```

## Formatos de salida

```bash
# JSON (recommended for scripting)
gcloud compute instances list --format=json

# YAML
gcloud compute instances list --format=yaml

# CSV
gcloud compute instances list --format="csv(name,zone,status)"

# Value (single field)
gcloud config get-value project --format="value()"

# Custom table
gcloud compute instances list \
  --format="table(name,zone,machineType,status)"
```

## Filtrado

```bash
# Server-side filtering (efficient)
gcloud compute instances list --filter="zone:us-central1-a"
gcloud compute instances list --filter="status=RUNNING"
gcloud compute instances list --filter="name~^web-.*"

# Multiple conditions
gcloud compute instances list \
  --filter="zone:us-central1 AND status=RUNNING"

# Negation
gcloud compute instances list --filter="NOT status=TERMINATED"
```

## Integración CI/CD

### Acciones de GitHub
```yaml
name: Deploy to GCP

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Deploy
        run: |
          gcloud run deploy my-service \
            --image=gcr.io/${{ secrets.GCP_PROJECT_ID }}/my-image \
            --region=us-central1
```

### GitLab CI
```yaml
deploy:
  image: google/cloud-sdk:alpine
  script:
    - echo $GCP_SA_KEY | base64 -d > key.json
    - gcloud auth activate-service-account --key-file=key.json
    - gcloud config set project $GCP_PROJECT_ID
    - gcloud app deploy
  only:
    - main
```

## Mejores prácticas

### Seguridad
- Nunca confirmes credenciales
- Usar suplantación de cuenta de servicio
- Otorgar permisos mínimos de IAM
- Rotar las llaves regularmente

### Actuación
- Utilice filtrado del lado del servidor:`--filter`
- Limitar la salida:`--limit=10`
- Proyecto sólo campos necesarios:`--format="value(name)"`
- Operaciones por lotes con`--async`

### Mantenibilidad
- Utilice configuraciones con nombre para entornos.
- Comandos de documentos
- Utilizar variables de entorno.
- Implementar manejo de errores y reintentos.

## Solución de problemas

```bash
# Check authentication
gcloud auth list

# Re-authenticate
gcloud auth login
gcloud auth application-default login

# Check IAM permissions
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:user@example.com"

# View configuration
gcloud config list

# Reset configuration
gcloud config configurations delete default
gcloud init
```

## Referencia rápida

| Tarea | Comando |
|------|---------|
| Inicializar |`gcloud init` |
| Iniciar sesión |`gcloud auth login` |
| Establecer proyecto |`gcloud config set project PROJECT_ID` |
| Listar recursos |`gcloud [SERVICE] list` |
| Crear recurso |`gcloud [SERVICE] create RESOURCE` |
| Eliminar recurso |`gcloud [SERVICE] delete RESOURCE` |
| Obtener ayuda |`gcloud [SERVICE] --help` |

## Banderas globales

| Bandera | Propósito |
|------|---------|
| `--project`| Anular proyecto |
| `--format`| Formato de salida (json, yaml, csv) |
| `--filter`| Filtro del lado del servidor |
| `--limit`| Limitar resultados |
| `--quiet`| Suprimir mensajes |
| `--verbosity`| Nivel de registro (depuración, información, advertencia, error) |
| `--async`| No esperes a la operación |

## Recursos

- Referencia de gcloud: https://cloud.google.com/sdk/gcloud/reference
- Instalación: https://cloud.google.com/sdk/docs/install
- Autenticación: https://cloud.google.com/docs/authentication
- Hoja de referencia: https://cloud.google.com/sdk/docs/cheatsheet
