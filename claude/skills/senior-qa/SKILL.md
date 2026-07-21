---
name: senior-qa
description: Skill integral de QA y testing para assurance de calidad, automatización de tests y estrategias de testing para aplicaciones ReactJS, NextJS, NodeJS. Incluye generación de test suites, análisis de coverage, setup E2E y métricas de calidad. Usar al diseñar estrategias de test, escribir casos de test, implementar automatización, realizar testing manual o analizar test coverage.
---

# Senior QA

Toolkit completo para senior QA con herramientas modernas y mejores prácticas.

## Inicio rápido

### Capacidades principales

Este skill proporciona tres capacidades core mediante scripts automatizados:

```bash

# Script 1: Generador de suite de pruebas
python scripts/test_suite_generator.py [options]

# Script 2: Analizador de cobertura
python scripts/coverage_analyzer.py [options]

# Script 3: Scaffolder de pruebas E2E
python scripts/e2e_test_scaffolder.py [options]
```

## Capacidades core

### 1. Test Suite Generator

Herramienta automatizada para tareas de generación de test suites.

**Features:**
- Scaffolding automatizado
- Best practices integradas
- Templates configurables
- Quality checks

**Uso:**

```bash
python scripts/test_suite_generator.py <project-path> [options]
```

### 2. Coverage Analyzer

Herramienta de análisis y optimización integral.

**Features:**
- Análisis profundo
- Métricas de rendimiento
- Recomendaciones
- Correcciones automatizadas

**Uso:**

```bash
python scripts/coverage_analyzer.py <target-path> [--verbose]
```

### 3. E2E Test Scaffolder

Tooling avanzado para tareas especializadas.

**Features:**
- Automatización nivel experto
- Configuraciones custom
- Listo para integración
- Output production-grade

**Uso:**

```bash
python scripts/e2e_test_scaffolder.py [arguments] [options]
```

## Documentación de referencia

### Estrategias de testing

Guía integral en`references/testing_strategies.md`:

- Patrones y prácticas detallados
- Ejemplos de código
- Mejores prácticas
- Anti-patrones a evitar
- Escenarios del mundo real

### Patrones de automatización de tests

Documentación completa de workflow en`references/test_automation_patterns.md`:

- Procesos paso a paso
- Estrategias de optimización
- Integraciones de tools
- Performance tuning
- Guía de troubleshooting

### Mejores prácticas QA

Guía de referencia técnica en`references/qa_best_practices.md`:

- Detalles del tech stack
- Ejemplos de configuración
- Patrones de integración
- Consideraciones de seguridad
- Directrices de escalabilidad

## Tech stack

**Lenguajes:** TypeScript, JavaScript, Python, Go, Swift, Kotlin
**Frontend:** React, Next.js, React Native, Flutter
**Backend:** Node.js, Express, GraphQL, REST APIs
**Database:** PostgreSQL, Prisma, NeonDB, Supabase
**DevOps:** Docker, Kubernetes, Terraform, GitHub Actions, CircleCI
**Cloud:** AWS, GCP, Azure

## Workflow de desarrollo

### 1. Setup y configuración

```bash

# Instalar dependencias
npm install

# or
pip install -r requirements.txt

# Configurar entorno
cp .env.example .env
```

### 2. Ejecutar controles de calidad

```bash

# Usar el script analizador
python scripts/coverage_analyzer.py .

# Revisar recomendaciones

# Aplicar correcciones
```

### 3. Implementar mejores prácticas

Sigue los patrones documentados en:
- `references/testing_strategies.md`-` references/test_automation_patterns.md`-` references/qa_best_practices.md`## Resumen de mejores prácticas

### Calidad de código
- Seguir patrones establecidos
- Escribir tests comprehensivos
- Documentar decisiones
- Revisar regularmente

### Rendimiento
- Medir antes de optimizar
- Usar caching apropiado
- Optimizar critical paths
- Monitorear en producción

### Seguridad
- Validar todas las entradas
- Usar queries parametrizadas
- Implementar autenticación adecuada
- Mantener dependencias actualizadas

### Mantenibilidad
- Escribir código claro
- Usar naming consistente
- Añadir comentarios útiles
- Mantenerlo simple

## Comandos comunes

```bash

# Desarrollo
npm run dev
npm run build
npm run test
npm run lint

# Análisis
python scripts/coverage_analyzer.py .
python scripts/e2e_test_scaffolder.py --analyze

# Despliegue
docker build -t app:latest .
docker-compose up -d
kubectl apply -f k8s/
```

## Solución de problemas

### Problemas comunes

Consulta la sección integral de troubleshooting en`references/qa_best_practices.md`.

### Obtener ayuda

- Revisar documentación de referencia
- Revisar mensajes de output de scripts
- Consultar documentación del tech stack
- Revisar logs de error

## Recursos

- Referencia de patrones: `references/testing_strategies.md`- Guía de workflow:` references/test_automation_patterns.md`- Guía técnica:` references/qa_best_practices.md`- Scripts de herramientas: directorio` scripts/`