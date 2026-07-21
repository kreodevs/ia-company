# Almacenamiento en Cloudflare R2

Almacenamiento de objetos compatible con S3 sin tarifas de salida.

## Inicio rápido

### Crear depósito
```bash
wrangler r2 bucket create my-bucket
wrangler r2 bucket create my-bucket --location=wnam
```

Ubicaciones:`wnam`, `enam`, `weur`, `eeur`, `apac`

### Cargar objeto
```bash
wrangler r2 object put my-bucket/file.txt --file=./local-file.txt
```

### Obligación de trabajadores

**wrangler.toml:**
```toml
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"
```

**Obrero:**
```typescript
// Put
await env.MY_BUCKET.put('user-uploads/photo.jpg', imageData, {
  httpMetadata: {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=31536000'
  },
  customMetadata: {
    uploadedBy: userId,
    uploadDate: new Date().toISOString()
  }
});

// Get
const object = await env.MY_BUCKET.get('large-file.mp4');
if (!object) {
  return new Response('Not found', { status: 404 });
}

return new Response(object.body, {
  headers: {
    'Content-Type': object.httpMetadata.contentType,
    'ETag': object.etag
  }
});

// List
const listed = await env.MY_BUCKET.list({
  prefix: 'user-uploads/',
  limit: 100
});

// Delete
await env.MY_BUCKET.delete('old-file.txt');

// Head (check existence)
const object = await env.MY_BUCKET.head('file.txt');
if (object) {
  console.log('Size:', object.size);
}
```

## Integración de la API de S3

### CLI de AWS
```bash
# Configure
aws configure
# Access Key ID: <your-key-id>
# Secret Access Key: <your-secret>
# Region: auto

# Operations
aws s3api list-buckets --endpoint-url https://<accountid>.r2.cloudflarestorage.com

aws s3 cp file.txt s3://my-bucket/ --endpoint-url https://<accountid>.r2.cloudflarestorage.com

# Presigned URL
aws s3 presign s3://my-bucket/file.txt --endpoint-url https://<accountid>.r2.cloudflarestorage.com --expires-in 3600
```

### JavaScript (AWS SDK v3)
```javascript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

await s3.send(new PutObjectCommand({
  Bucket: "my-bucket",
  Key: "file.txt",
  Body: fileContents
}));
```

### Pitón (Boto3)
```python
import boto3

s3 = boto3.client(
    service_name='s3',
    endpoint_url=f'https://{account_id}.r2.cloudflarestorage.com',
    aws_access_key_id=access_key_id,
    aws_secret_access_key=secret_access_key,
    region_name='auto'
)

s3.upload_fileobj(file_obj, 'my-bucket', 'file.txt')
s3.download_file('my-bucket', 'file.txt', './local-file.txt')
```

## Cargas de varias partes

Para archivos >100 MB:

```typescript
const multipart = await env.MY_BUCKET.createMultipartUpload('large-file.mp4');

// Upload parts (5MiB - 5GiB each, max 10,000 parts)
const part1 = await multipart.uploadPart(1, chunk1);
const part2 = await multipart.uploadPart(2, chunk2);

// Complete
const object = await multipart.complete([part1, part2]);
```

### Rclone (archivos grandes)
```bash
rclone config  # Configure Cloudflare R2

# Upload with optimization
rclone copy large-video.mp4 r2:my-bucket/ \
  --s3-upload-cutoff=100M \
  --s3-chunk-size=100M
```

## Cubos públicos

### Habilitar acceso público
1. Panel de control → R2 → Depósito → Configuración → Acceso público
2. Agregue un dominio personalizado (recomendado) o use r2.dev

**r2.dev (velocidad limitada):**
```
https://pub-<hash>.r2.dev/file.txt
```

**Dominio personalizado (producción):**
Cloudflare maneja DNS/TLS automáticamente

## Configuración CORS

```bash
wrangler r2 bucket cors put my-bucket --rules '[
  {
    "AllowedOrigins": ["https://example.com"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]'
```

## Reglas del ciclo de vida

```bash
wrangler r2 bucket lifecycle put my-bucket --rules '[
  {
    "action": {"type": "AbortIncompleteMultipartUpload"},
    "filter": {},
    "abortIncompleteMultipartUploadDays": 7
  },
  {
    "action": {"type": "Transition", "storageClass": "InfrequentAccess"},
    "filter": {"prefix": "archives/"},
    "daysFromCreation": 90
  }
]'
```

## Notificaciones de eventos

```bash
wrangler r2 bucket notification create my-bucket \
  --queue=my-queue \
  --event-type=object-create
```

Eventos soportados:`object-create`, `object-delete`

## Migración de datos

### Sippy (incremental)
```bash
wrangler r2 bucket sippy enable my-bucket \
  --provider=aws \
  --bucket=source-bucket \
  --region=us-east-1 \
  --access-key-id=$AWS_KEY \
  --secret-access-key=$AWS_SECRET
```

Los objetos migran en la primera solicitud.

### Súper Slurper (a granel)
Utilice el panel para realizar una migración completa por única vez desde AWS, GCS y Azure.

## Mejores prácticas

### Actuación
- Utilice Cloudflare Cache con dominios personalizados
- Cargas de varias partes para archivos >100 MB
- Rclone para operaciones por lotes
- Las sugerencias de ubicación coinciden con la geografía del usuario.

### Seguridad
- Nunca confirmes las claves de acceso
- Utilizar variables de entorno.
- Tokens con alcance de cubo para privilegios mínimos
- URL prefirmadas para acceso temporal
- Habilite el acceso a Cloudflare para protección

### Optimización de costos
- Almacenamiento de acceso poco frecuente para archivos (más de 30 días)
- Reglas de ciclo de vida para transición/eliminación automática
- Fragmentos multiparte más grandes = menos operaciones de Clase A
- Monitorear el uso a través del panel

### Nombrar
- Nombres de depósitos: minúsculas, guiones, de 3 a 63 caracteres
- Evite prefijos secuenciales (use hash para mejorar el rendimiento)
- No hay puntos en los nombres de los depósitos si se utilizan dominios personalizados con TLS

## Límites

- Cubos por cuenta: 1.000
- Tamaño del objeto: 5 TB máx.
- Reglas del ciclo de vida: 1000 por depósito.
- Reglas de notificación de eventos: 100 por depósito
- Límite de velocidad de r2.dev: 1000 solicitudes/min (use dominios personalizados)

## Solución de problemas

**401 no autorizado:**
- Verificar claves de acceso
- Verificar que la URL del punto final incluya el ID de la cuenta
- Asegúrese de que la región sea "automática"

**403 Prohibido:**
- Verificar los permisos del depósito
- Verificar la configuración de CORS
- Confirmar que existe el depósito

**Las URL prefirmadas no funcionan:**
- Verificar la configuración de CORS
- Verifique el tiempo de vencimiento de la URL
- Asegúrese de que el origen coincida con las reglas CORS

## Recursos

- Documentos: https://developers.cloudflare.com/r2/
- Wrangler: https://developers.cloudflare.com/r2/reference/wrangler-commands/
- Compatibilidad S3: https://developers.cloudflare.com/r2/api/s3/api/
- API de trabajadores: https://developers.cloudflare.com/r2/api/workers/
