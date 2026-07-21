---
name: find-skills
description: Ayuda a los usuarios a descubrir e instalar skills de agente cuando preguntan cosas como "¿cómo hago X?", "encuentra un skill para X", "¿hay un skill que pueda...", o expresan interés en ampliar capacidades. Usar este skill cuando el usuario busque funcionalidad que podría existir como skill instalable.
---

# Buscar skills

Este skill te ayuda a descubrir e instalar skills del ecosistema abierto de agent skills.

## Cuándo usar este skill

Usa este skill cuando el usuario:

- Pregunta "¿cómo hago X?" donde X podría ser una tarea común con un skill existente
- Dice "encuentra un skill para X" o "¿hay un skill para X?"
- Pregunta "¿puedes hacer X?" donde X es una capacidad especializada
- Expresa interés en ampliar las capacidades del agente
- Quiere buscar herramientas, plantillas o flujos de trabajo
- Menciona que desearía ayuda en un dominio concreto (diseño, testing, despliegue, etc.)

## ¿Qué es Skills CLI?

Skills CLI (`npx skills`) es el gestor de paquetes del ecosistema abierto de agent skills. Los skills son paquetes modulares que amplían las capacidades del agente con conocimiento especializado, flujos de trabajo y herramientas.

**Comandos clave:**

- `npx skills find [query]`- Buscar skills de forma interactiva o por palabra clave
- `npx skills add <package>`- Instalar un skill desde GitHub u otras fuentes
- `npx skills check`- Comprobar actualizaciones de skills
- `npx skills update`- Actualizar todos los skills instalados

**Explorar skills en:** https://skills.sh/

## Cómo ayudar a los usuarios a encontrar skills

### Paso 1: Entender qué necesitan

Cuando un usuario pide ayuda con algo, identifica:

1. El dominio (p. ej., React, testing, diseño, despliegue)
2. La tarea concreta (p. ej., escribir tests, crear animaciones, revisar PRs)
3. Si es una tarea lo bastante común como para que probablemente exista un skill

### Paso 2: Buscar skills

Ejecuta el comando find con una consulta relevante:

```bash
npx skills find [query]
```Por ejemplo:

- El usuario pregunta "¿cómo hago mi app React más rápida?" → `npx skills find react performance`- El usuario pregunta "¿puedes ayudarme con revisiones de PR?" →` npx skills find pr review`- El usuario pregunta "necesito crear un changelog" →` npx skills find changelog`El comando devolverá resultados como:

```
Install with npx skills add <owner/repo@skill>

vercel-labs/agent-skills@vercel-react-best-practices
└ https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices
```

### Paso 3: Presentar opciones al usuario

Cuando encuentres skills relevantes, preséntaselos con:

1. El nombre del skill y qué hace
2. El comando de instalación que pueden ejecutar
3. Un enlace para saber más en skills.sh

Ejemplo de respuesta:

```
¡Encontré un skill que puede ayudar! El skill "vercel-react-best-practices" proporciona
directrices de optimización de rendimiento para React y Next.js de Vercel Engineering.

Para instalarlo:
npx skills add vercel-labs/agent-skills@vercel-react-best-practices

Más información: https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices
```

### Paso 4: Ofrecer instalar

Si el usuario quiere continuar, puedes instalar el skill por él:

```bash
npx skills add <owner/repo@skill> -g -y
```La bandera`-g` instala globalmente (a nivel de usuario) y`-y` omite los prompts de confirmación.

## Categorías comunes de skills

Al buscar, considera estas categorías habituales:

| Categoría        | Consultas de ejemplo                     |
| ---------------- | ---------------------------------------- |
| Desarrollo web   | react, nextjs, typescript, css, tailwind |
| Testing          | testing, jest, playwright, e2e           |
| DevOps           | deploy, docker, kubernetes, ci-cd        |
| Documentación    | docs, readme, changelog, api-docs        |
| Calidad de código| review, lint, refactor, best-practices   |
| Diseño           | ui, ux, design-system, accessibility     |
| Productividad    | workflow, automation, git                |

## Consejos para búsquedas efectivas

1. **Usa palabras clave específicas**: "react testing" es mejor que solo "testing"
2. **Prueba términos alternativos**: Si "deploy" no funciona, prueba "deployment" o "ci-cd"
3. **Revisa fuentes populares**: Muchos skills vienen de `vercel-labs/agent-skills` o`ComposioHQ/awesome-claude-skills`## Cuando no se encuentran skills

Si no existen skills relevantes:

1. Reconoce que no se encontró un skill existente
2. Ofrece ayudar con la tarea directamente usando tus capacidades generales
3. Sugiere que el usuario puede crear su propio skill con `npx skills init` Ejemplo:

```
Busqué skills relacionados con "xyz" pero no encontré coincidencias.
¡Aún puedo ayudarte con esta tarea directamente! ¿Quieres que continúe?

Si haces esto a menudo, podrías crear tu propio skill:
npx skills init my-xyz-skill
```