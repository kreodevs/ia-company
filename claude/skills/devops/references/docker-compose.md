# Docker Compose

Orquestación de aplicaciones multi-contenedor.

## Estructura básica

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/app
    depends_on:
      - db
      - redis
    volumes:
      - ./src:/app/src
    networks:
      - app-network
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    networks:
      - app-network
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

## Comandos

```bash
# Start services
docker compose up
docker compose up -d

# Build images before starting
docker compose up --build

# Scale service
docker compose up -d --scale web=3

# Stop services
docker compose down

# Stop and remove volumes
docker compose down --volumes

# Logs
docker compose logs
docker compose logs -f web

# Execute command
docker compose exec web sh
docker compose exec db psql -U user -d app

# List services
docker compose ps

# Restart service
docker compose restart web

# Pull images
docker compose pull

# Validate
docker compose config
```

## Configuraciones por entorno

**compose.yml (base):**
```yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
```

**compose.override.yml (dev, auto-loaded):**
```yaml
services:
  web:
    volumes:
      - ./src:/app/src  # Live reload
    environment:
      - NODE_ENV=development
      - DEBUG=true
    command: npm run dev
```

**compose.prod.yml (production):**
```yaml
services:
  web:
    image: registry.example.com/myapp:1.0
    restart: always
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

**Uso:**
```bash
# Desarrollo (uses compose.yml + compose.override.yml)
docker compose up

# Production
docker compose -f compose.yml -f compose.prod.yml up -d
```

## Comprobaciones de salud

```yaml
services:
  web:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      start_period: 40s
      retries: 3
```

## Límites de recursos

```yaml
services:
  web:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## Registro

```yaml
services:
  web:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Variables de entorno

**Usando archivo .env:**
```bash
# .env
DATABASE_URL=postgresql://user:pass@db:5432/app
API_KEY=secret
```

```yaml
services:
  web:
    env_file:
      - .env
```

## Redes

Los servicios en la misma red se comunican mediante el nombre del servicio:

```yaml
services:
  web:
    depends_on:
      - db
    environment:
      # Use service name as hostname
      - DATABASE_URL=postgresql://user:pass@db:5432/app
```

## Backup/restauración de volúmenes

```bash
# Backup
docker compose run --rm -v app_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/backup.tar.gz /data

# Restore
docker compose run --rm -v app_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/backup.tar.gz -C /data
```

## Stacks comunes

### Web + Database + Cache
```yaml
services:
  web:
    build: .
    depends_on:
      - db
      - redis
  db:
    image: postgres:15-alpine
  redis:
    image: redis:7-alpine
```

### Microservicios
```yaml
services:
  api-gateway:
    build: ./gateway
  user-service:
    build: ./services/users
  order-service:
    build: ./services/orders
  rabbitmq:
    image: rabbitmq:3-management
```

## Buenas prácticas

- Usa volúmenes con nombre para persistencia de datos
- Implementa health checks para todos los servicios
- Establece políticas de reinicio para producción
- Usa archivos compose específicos por entorno
- Configura límites de recursos
- Habilita logging con límites de tamaño
- Usa depends_on para ordenar servicios
- Aislamiento de red con redes personalizadas

## Solución de problemas

```bash
# View service logs
docker compose logs -f service-name

# Check service status
docker compose ps

# Restart specific service
docker compose restart service-name

# Rebuild service
docker compose up --build service-name

# Remove everything
docker compose down --volumes --rmi all
```

## Recursos

- Docs: https://docs.docker.com/compose/
- Compose Specification: https://docs.docker.com/compose/compose-file/
- Best Practices: https://docs.docker.com/compose/production/
