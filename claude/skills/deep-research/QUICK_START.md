# Deep Research Skill - Guía de inicio rápido

## ¿Qué es esto?

Un motor de investigación integral para Claude Code que **iguala y supera** la función "Advanced Research" de Claude Desktop. Realiza investigación profunda de nivel empresarial con razonamiento extendido, síntesis multi-fuente e informes respaldados por citas.

## Cómo usar

### Invocación simple (recomendada)

Solo pide a Claude Code que use deep research:

```
Use deep research to analyze the current state of AI agent frameworks in 2025
```

```
Deep research: Should we migrate from PostgreSQL to Supabase?
```

```
Use deep research in ultradeep mode to review recent advances in longevity science
```

### Uso directo por CLI

```bash
# Standard research (6 phases, ~5-10 minutes)
python3 ~/.claude/skills/deep-research/research_engine.py \
  --query "Your research question" \
  --mode standard

# Deep research (8 phases, ~10-20 minutes)
python3 ~/.claude/skills/deep-research/research_engine.py \
  --query "Your research question" \
  --mode deep

# Quick research (3 phases, ~2-5 minutes)
python3 ~/.claude/skills/deep-research/research_engine.py \
  --query "Your research question" \
  --mode quick

# Ultra-deep research (8+ phases, ~20-45 minutes)
python3 ~/.claude/skills/deep-research/research_engine.py \
  --query "Your research question" \
  --mode ultradeep
```

## Modos de investigación explicados

| Modo | Fases | Tiempo | Usar cuando |
|------|--------|------|----------|
| **Quick** | 3 | 2-5 min | Exploración inicial, preguntas simples |
| **Standard** | 6 | 5-10 min | La mayoría de necesidades de investigación (por defecto) |
| **Deep** | 8 | 10-20 min | Temas complejos, decisiones importantes |
| **UltraDeep** | 8+ | 20-45 min | Análisis crítico, informes comprehensivos |

## Qué obtienes

Cada informe de investigación incluye:

- **Executive Summary** - Hallazgos clave en 3-5 viñetas
- **Detailed Analysis** - Con citas completas [1], [2], [3]
- **Synthesis & Insights** - Insights novedosos más allá de las fuentes
- **Limitations & Caveats** - Qué es incierto o falta
- **Recommendations** - Próximos pasos accionables
- **Full Bibliography** - Todas las fuentes con puntuaciones de credibilidad
- **Methodology Appendix** - Cómo se realizó la investigación

## Ubicación de salida

Toda la investigación se guarda en:
```
~/.claude/research_output/
```

Formato: `research_report_YYYYMMDD_HHMMSS.md`

## Funciones que superan a Claude Desktop Research

✅ **Pipeline de 8 fases** - Más exhaustivo que el enfoque de Claude Desktop
✅ **Múltiples modos de investigación** - Elige profundidad vs velocidad
✅ **Puntuación de credibilidad de fuentes** - Evalúa cada fuente (puntuación 0-100)
✅ **Graph-of-Thoughts** - Exploración no lineal con razonamiento ramificado
✅ **Gestión de citas** - Seguimiento automático y generación de bibliografía
✅ **Fase de crítica** - Análisis red-team integrado de hallazgos
✅ **Fase de refinamiento** - Aborda brechas antes de finalizar
✅ **Integración con archivos locales** - Puede buscar en tu codebase/docs
✅ **Ejecución de código** - Puede ejecutar análisis y validaciones

## Casos de uso de ejemplo

### Evaluación tecnológica
```
Use deep research to compare Next.js 15 vs Remix vs Astro for my project
```

### Análisis de mercado
```
Deep research: What are the key trends in longevity biotech funding 2023-2025?
```

### Decisión técnica
```
Use deep research to help me choose between Auth0, Clerk, and Supabase Auth
```

### Revisión científica
```
Use deep research in ultradeep mode to summarize senolytics research progress
```

### Inteligencia competitiva
```
Deep research: Who are the top 5 competitors in the AI code assistant space?
```

## Estándares de calidad

Cada informe garantiza:
- ✅ 10+ fuentes distintas (salvo temas muy especializados)
- ✅ Verificación con 3+ fuentes para afirmaciones importantes
- ✅ Seguimiento completo de citas
- ✅ Evaluación de credibilidad por fuente
- ✅ Limitaciones documentadas
- ✅ Metodología explicada

## Consejos para mejores resultados

1. **Sé específico** - "Compare X vs Y for use case Z" es mejor que "Tell me about X"
2. **Indica tu objetivo** - "Help me decide..." vs "Give me an overview..."
3. **Elige el modo correcto** - Usa Quick para exploración, Deep para decisiones
4. **Revisa el alcance primero** - Revisa la salida de la Fase 1 para confirmar el rumbo
5. **Usa las citas** - Profundiza preguntando sobre fuentes específicas [1], [2], etc.

## Arquitectura

```
deep-research/
├── SKILL.md                 # Main skill definition (11KB)
├── research_engine.py       # Core engine (16KB)
├── utils/
│   ├── citation_manager.py # Citation tracking (6KB)
│   └── source_evaluator.py # Credibility scoring (8KB)
├── README.md               # Full documentation
├── QUICK_START.md          # This guide
└── requirements.txt        # No external deps needed!
```

## ¡Sin dependencias requeridas!

La skill usa solo la biblioteca estándar de Python — no se necesita pip install para uso básico.

## Versión

**v1.0** - Lanzado 2025-11-04

Construido para igualar y superar la función Advanced Research de Claude Desktop.

---

**¿Listo para usar?** Solo escribe:
```
Use deep research to [your question here]
```

¡Claude Code cargará automáticamente esta skill y ejecutará el pipeline de investigación!
