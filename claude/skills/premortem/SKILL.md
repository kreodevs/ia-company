---
name: premortem
description: Análisis pre-mortem que imagina que un plan ha fallado y trabaja hacia atrás para identificar causas y prevenciones. Usar antes de lanzamientos, decisiones importantes o iniciativas riesgosas para exponer riesgos ocultos.
user-invocable: true
---

# Análisis pre-mortem

Imagina que el plan ha fallado por completo, luego trabaja hacia atrás para identificar qué salió mal y cómo prevenirlo.

## Instrucciones

Plantea la escena: "Es [marco temporal] en el futuro. Esta iniciativa fue un desastre total. Mirando atrás, ¿qué pasó?"

Genera escenarios de fallo sin filtrar por probabilidad: primero saca todo a la mesa, luego prioriza.

### Formato de salida

**El plan**
Resume qué se intenta y los criterios de éxito.

**Salto temporal**
"Han pasado [X meses]. Esto ha fallado por completo. El resultado: [describe el desastre con detalle]."

**Qué salió mal**

Genera 8-12 causas plausibles de fallo en categorías:

| Categoría | Modo de fallo | Cómo se desarrolló |
|----------|--------------|-------------------|
| Ejecución | [Qué falló] | [La historia de cómo] |
| Externo | [Qué falló] | [La historia de cómo] |
| Personas | [Qué falló] | [La historia de cómo] |
| Técnico | [Qué falló] | [La historia de cómo] |
| Supuestos | [Qué falló] | [La historia de cómo] |

**Priorización de riesgos**

| Modo de fallo | Probabilidad | Impacto | Prioridad |
|--------------|------------|--------|----------|
| ... | Alta/Media/Baja | Alta/Media/Baja | 1-5 |

**Top 3 riesgos y mitigaciones**

Para cada riesgo principal:
- **Riesgo**: [Descripción]
- **Señales tempranas de alerta**: ¿Qué indicaría que está ocurriendo?
- **Prevención**: Cómo reducir la probabilidad
- **Mitigación**: Cómo reducir el impacto si ocurre
- **Responsable**: ¿Quién vigila esto?

**Insights del pre-mortem**
¿Qué reveló este ejercicio que no era obvio antes?

**Confianza revisada**
Tras este análisis, ¿qué tan confiado estás en el éxito? ¿Qué aumentaría la confianza?

## Directrices

- Sé vívido y específico: "la base de datos se corrompió", no "algo salió mal"
- Incluye posibilidades incómodas (se va una persona clave, mueve un competidor, nos equivocamos)
- No filtres con "eso no pasará": el punto es exponer preocupaciones ocultas
- Asigna responsables reales a las mitigaciones
- Busca puntos únicos de fallo$ARGUMENTS