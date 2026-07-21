---
name: team
description: "Formar equipos temporales de AI Agents según la tarea. Selecciona automáticamente los miembros más adecuados desde .claude/agents/ para formar el equipo."
argument-hint: "[descripción de la tarea]"
disable-model-invocation: true
---

# Formar equipo temporal

Debes seleccionar, según la tarea siguiente, los AI Agents más adecuados de la empresa para formar un equipo temporal que colabore en completarla.

## Tarea

$ARGUMENTS

## Agents disponibles

Estos son todos los Agents de la empresa, definidos en el directorio `.claude/agents/`:

| Agent | Archivo | Función |
|-------|------|------|
| CEO | `ceo-bezos`| Decisiones estratégicas, modelo de negocio, PR/FAQ, prioridades |
| CTO | `cto-vogels`| Arquitectura técnica, selección tecnológica, diseño de sistemas |
| Pensamiento inverso | `critic-munger`| Cuestionar decisiones, identificar fallos fatales, Pre-Mortem, prevenir ilusión grupal |
| Diseño de producto | `product-norman`| Definición de producto, experiencia de usuario, usabilidad |
| Diseño UI | `ui-duarte`| Diseño visual, design system, color y tipografía |
| Diseño de interacción | `interaction-cooper`| Flujos de usuario, Persona, patrones de interacción |
| Desarrollo fullstack | `fullstack-dhh`| Implementación de código, soluciones técnicas, desarrollo |
| QA | `qa-bach`| Estrategia de testing, control de calidad, análisis de bugs |
| DevOps/SRE | `devops-hightower`| Pipelines de deploy, CI/CD, infraestructura, monitoreo y operaciones |
| Marketing | `marketing-godin`| Posicionamiento, marca, adquisición, contenido |
| Operaciones | `operations-pg`| Operaciones de usuarios, crecimiento, comunidad, PMF |
| Ventas | `sales-ross`| Embudo de ventas, estrategia de conversión |
| CFO | `cfo-campbell`| Estrategia de pricing, modelo financiero, control de costos, unit economics |
| Investigación y análisis | `research-thompson`| Investigación de mercado, análisis competitivo, tendencias del sector, descubrimiento de oportunidades |

## Pasos de ejecución

### 1. Analizar la tarea y seleccionar miembros

Según la naturaleza de la tarea, elige 2-5 Agents más relevantes como miembros del equipo. Principios de selección:
- **Solo los necesarios**: no es mejor tener más personas; debe haber coincidencia precisa con la tarea
- **Considerar la cadena de colaboración**: si la tarea va de diseño a desarrollo, asegura que los roles clave de la cadena estén presentes
- **Evitar redundancia**: no selecciones roles con funciones superpuestas al mismo tiempo

Explica brevemente al fundador a quién elegiste y por qué, luego comienza de inmediato a formar el equipo.

### 2. Formar Agent Team

Usa la funcionalidad Agent Teams para formar el equipo temporal:
- Crea el equipo; `team_name` basado en la tarea, nombre corto (inglés, kebab-case)
- Crea tareas concretas para cada miembro (TaskCreate); la descripción debe incluir contexto suficiente
- Usa la herramienta Task para spawn de cada teammate; `subagent_type` elige `general-purpose`; en el prompt inyecta el contenido completo del archivo agent correspondiente como rol
- Al spawnear teammate, indica por prompt: tu rol, la tarea a completar, documentos de salida en `docs/<role>/`

### 3. Coordinación y resumen

- Como team lead, coordina el trabajo de los miembros
- Recopila los entregables y resume en una conclusión o plan unificado
- Si hay desacuerdos, lista las posturas para que el fundador decida
- Al terminar, limpia los recursos del equipo

## Notas

- Toda la comunicación en español; términos técnicos en inglés
- Los documentos de cada miembro se guardan en `docs/<role>/` según convención
- El equipo es temporal; se disuelve al completar la tarea
- El fundador es el decisor final; los Agents aconsejan pero no sustituyen la decisión