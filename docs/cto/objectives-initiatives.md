# Objetivos e iniciativas (Fase F)

## Modelo

- `CompanyGoal` — objetivo medible (`targetValue`, `currentValue`).
- `Initiative` — iniciativa bajo un objetivo (`companyGoalId`).
- `ExecutionRun.companyGoalId` / `initiativeId` — vínculo del encargo.

## API

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/office/objectives` | Listado |
| GET | `/office/objectives/:id` | Detalle con KPIs, rollups por iniciativa y encargos recientes |
| GET | `/office/encargos?companyGoalId=&initiativeId=` | Filtrar trabajo por estrategia |

## Progreso

`computeGoalProgressPercent` actualiza `currentValue` al cargar el detalle del objetivo: ratio de encargos `COMPLETED` sobre total vinculado, escalado por `targetValue`.

## Lanzamiento de encargo

`POST /office/tasks/execute` acepta `companyGoalId` e `initiativeId`. El contexto se inyecta en el brief (`strategic-context.ts`) y en `sharedMemory`.
