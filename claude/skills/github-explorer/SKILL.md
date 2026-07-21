---
name: github-explorer
description: >
  Análisis profundo de proyectos GitHub. Usar cuando el usuario mencione un repo/proyecto de GitHub
  y quiera entenderlo — activado por frases como "ayúdame a ver este proyecto", "conoce XXX",
  "¿qué tal este proyecto?", "analiza el repo", o cualquier solicitud de explorar/evaluar un proyecto GitHub.
  Cubre arquitectura, salud comunitaria, panorama competitivo y fuentes de conocimiento cross-platform.
---

# GitHub Explorer — Análisis profundo de proyectos

> **Filosofía**: El README es solo la fachada; el valor real está en Issues, Commits y discusiones de la comunidad.

## Flujo de trabajo

```
[nombre del proyecto] → [1. Localizar repo] → [2. Recolección multi-fuente] → [3. Análisis] → [4. Output estructurado]
```

### Fase 1: buscar repositorio

- Uso `web_search` para buscar`site:github.com <project_name>` y confirmar org/repo completo
- Usar `search-layer`(modo Deep + intent aware) para complementar con enlaces comunitarios y recursos fuera de GitHub:

```bash
  python3 skills/search-layer/scripts/search.py \
    --queries "<project_name> review" "<project_name> 评测 使用体验" \
    --mode deep --intent exploratory --num 5
  ```- Usar` web_fetch`para capturar la página del repo (README, Stars, Forks, License, última actualización)

### Fase 2: Recolección multi-fuente (en paralelo)

Revisar las siguientes fuentes **según necesidad**; capturar si existen, omitir si no:

| Fuente | Patrón URL | Contenido a capturar | Herramienta sugerida |
|---|---|---|---|
| GitHub Repo | `github.com/{org}/{repo}`| LÉAME, Acerca de, Colaboradores |` web_fetch`|
| Problemas de GitHub | `github.com/{org}/{repo}/issues?q=sort:comments`| Top 3-5 Issues de alta calidad |` browser`|
| Comunidad china | WeChat/Zhihu/Xiaohongshu | Reviews profundas, experiencia de uso | `content-extract`|
| Blogs técnicos | Medio/Desarrollo | Análisis arquitectónico | `web_fetch`/` content-extract`|
| Foros | V2EX/Reddit | Comentarios de los usuarios, puntos débiles | `search-layer`(modo Deep) |

#### Especificación de llamadas a search-layer

search-layer v2 soporta scoring por intent. Uso recomendado en github-explorer:

| Escenario | Comando | Notas |
|------|------|------|
| **Investigación de proyecto (default)** | `python3 skills/search-layer/scripts/search.py --queries "<project> review" "<project> 评测" --mode deep --intent exploratory --num 5`| Multi-consulta en paralelo, orden por autoridad |
| **Novedades recientes** | `python3 skills/search-layer/scripts/search.py "<project> latest release" --mode deep --intent status --freshness pw --num 5`| Prioriza frescura, filtra última semana |
| **Comparación competitiva** | `python3 skills/search-layer/scripts/search.py --queries "<project> vs <competitor>" "<project> alternatives" --mode deep --intent comparison --num 5`| Intent de comparación, doble peso keyword+autoridad |
| **Búsqueda rápida de enlaces** | `python3 skills/search-layer/scripts/search.py "<project> official docs" --mode fast --intent resource --num 3`| Match exacto, más rápido |
| **Discusión comunitaria** | `python3 skills/search-layer/scripts/search.py "<project> discussion experience" --mode deep --intent exploratory --domain-boost reddit.com,news.ycombinator.com --num 5`| Boost a sitios comunitarios |

**Tipos de intent**: `factual`/` status`/` comparison`/` tutorial`/` exploratory`/` news`/` resource`> Sin`--intent`, el comportamiento es idéntico a v1 (sin scoring, orden original).

Reglas de degradación: Exa/Tavily 429/5xx → continuar con fuentes restantes; fallo total del script → volver a `web_search` single-source.

---

### Protocolo de degradación y mejora de extracción (Extraction Upgrade)

Cuando ocurra lo siguiente, **debes** pasar de `web_fetch` a`content-extract`:
1. **Restricción de dominio**:`mp.weixin.qq.com`,` zhihu.com`,` xiaohongshu.com`.
2. **Estructura compleja**: página con muchas fórmulas (LaTeX), tablas complejas, o Markdown de `web_fetch` muy desordenado.
3. **Contenido faltante**: `web_fetch` devuelve vacío o página Challenge por anti-bot.

Forma de invocación:

```bash
python3 skills/content-extract/scripts/content_extract.py --url <URL>
```content-extract internamente:
- Revisa whitelist de dominios (WeChat/Zhihu, etc.); si coincide, va directo a MinerU
- Si no, usa `web_fetch` como sonda; si falla, fallback a MinerU-HTML
- Devuelve contrato JSON unificado (con`ok`,` markdown`,` sources`, etc.)

### Fase 3: Análisis

Basado en los datos recolectados:

- **Etapa del proyecto**: experimento temprano / crecimiento rápido / maduro estable / modo mantenimiento / estancado (según frecuencia y contenido de commits)
- **Criterio de Issue destacado**: muchos comentarios, participación del maintainer, expone problemas de arquitectura, o incluye discusión técnica valiosa
- **Identificación de competidores**: desde secciones "Comparison"/"Alternatives" del README, discusiones en Issues y búsqueda web

### Fase 4: Output estructurado

Seguir estrictamente esta plantilla; **cada módulo debe tener contenido sustancial o indicar explícitamente "no encontrado"**.

#### Reglas de formato (obligatorias)

1. **El título debe enlazar al repo de GitHub** (formato:`# [Project Name](https://github.com/org/repo)`, clic para ir)
2. **Línea en blanco uniforme antes y después del título** (fin del bloque anterior → blanco → título → blanco → contenido)
3. **Fix de línea en blanco para Telegram (obligatorio)**: Telegram elimina la línea en blanco tras items de lista (`-`). Solución: entre el final de la lista y el siguiente título, insertar una línea con espacio braille`⠀`(U+2800), formato:

```
   - último item de la lista

   ⠀
   **siguiente título**
   ```Garantiza que el espacio antes del título no se pierda en Telegram.
2. **Todos los títulos en negrita** (emoji + texto en negrita)
3. **Comparación competitiva con enlaces** (GitHub / web oficial / docs, al menos uno)
4. **Volumen comunitario concreto**: citar resumen de posts/tweets/discusiones con enlace original. No escribir "muy bien valorado" o "muy popular"; escribir "X dijo Y" o "el post Z discutió el problema W"
5. **Principio de trazabilidad**: toda información externa citada debe llevar enlace original

```markdown

# [{Project Name}]({GitHub Repo URL})

**🎯 Posicionamiento en una frase**

{Qué es, qué problema resuelve}

**⚙️ Mecanismo core**

{Principio/arquitectura en lenguaje claro, no copiar README. Incluir stack clave.}

**📊 Salud del proyecto**

- **Stars**: {cantidad}  |  **Forks**: {cantidad}  |  **License**: {tipo}
- **Equipo/autor**: {background}
- **Tendencia de commits**: {actividad reciente + juicio de etapa}
- **Novedades recientes**: {resumen de commits importantes recientes}

**🔥 Issues destacados**

{Top 3-5 Issues de calidad; cada uno con título, enlace y punto central. Si no hay, indicarlo.}

**✅ Escenarios de uso**

{Cuándo usarlo, qué problema concreto resuelve}

**⚠️ Limitaciones**

{Cuándo no usarlo, problemas conocidos}

**🆚 Comparación competitiva**

{Proyectos del mismo segmento y diferencias. Cada competidor con enlace GitHub o web, ejemplo:}
- **vs [GraphRAG](https://github.com/microsoft/graphrag)** — descripción de la diferencia
- **vs [RAGFlow](https://github.com/infiniflow/ragflow)** — descripción de la diferencia

**🌐 Grafo de conocimiento**

- **DeepWiki**: {enlace o "no indexado"}
- **Zread.ai**: {enlace o "no indexado"}

**🎬 Demo**

{Enlace de prueba online, o "ninguno"}

**📄 Papers relacionados**

{Enlace arXiv, o "ninguno"}

**📰 Volumen comunitario**

**X/Twitter**

{Resumen concreto de tweets + enlace, ejemplo:}
- [@usuario](enlace): "dijo concretamente..."
- [hilo](enlace): discutió el problema X...
{Si no hay, indicar "no se encontraron discusiones"}

**Comunidad china**

{Resumen de posts + enlace, ejemplo:}
- [Zhihu: título del post](enlace) — de qué trata
- [V2EX: título del post](enlace) — de qué trata
{Si no hay, indicar "no se encontraron discusiones"}

**💬 Mi juicio**

{Evaluación subjetiva: si vale la pena invertir tiempo, para qué nivel encaja, cómo recomendaría usarlo}
```

## Notas de ejecución

- Priorizar `web_search`+` web_fetch`;` browser`como respaldo
- **Mejora de búsqueda**: investigación de proyectos usa por defecto `search-layer` v2 modo Profundo +`--intent exploratory`(Brave + Exa + Tavily en paralelo con dedup + scoring por intent); fallo de una fuente no bloquea el flujo
- **Degradación de extracción (obligatoria)**: si `web_fetch` falla/403/anti-bot/contenido corto, o dominio de alto riesgo (WeChat/Zhihu/Xiaohongshu): usar`content-extract`(fallback interno a MinerU-HTML) para Markdown más limpio + sources trazables
- Recolectar fuentes en paralelo para eficiencia
- Todos los enlaces deben ser reales y accesibles; no inventar URLs
- Output en español; términos técnicos en inglés

## ⚠️ Checklist de autoverificación (obligatorio, antes de enviar)

Antes de enviar el informe, **verificar cada punto**:

- [ ] **Enlace en título**: formato`# [Project Name](GitHub URL)`, clic funcional
- [ ] **Líneas en blanco en títulos**: cada título en negrita (`**🎯 ...**`) con una línea en blanco antes y después
- [ ] **Línea Telegram**: cada bloque de lista termina con línea de espacio braille `⠀` antes del siguiente título
- [ ] **Enlaces de Issues**: cada Issue en formato completo `[#n título](URL completa)`- [ ] **Enlaces de competidores**: cada competidor con`[nombre](GitHub/web)`- [ ] **Enlaces de volumen comunitario**: cada cita con`[fuente: título](URL)`- [ ] **Sin descripciones vacías**: en volumen comunitario no hay "muy bien valorado", "muy popular", etc.
- [ ] **Trazabilidad**: toda cita externa con enlace original

## Dependencias

Este skill depende de las siguientes herramientas y skills de OpenClaw:

| Dependencia | Tipo | Uso |
|------|------|------|
| `web_search`| Herramienta integrada | Búsqueda Brave Search |
| `web_fetch`| Herramienta integrada | Captura de contenido web |
| `browser`| Herramienta integrada | Renderizado de páginas dinámicas (respaldo) |
| `search-layer`| Skill | Búsqueda multi-fuente + scoring por intent (Brave + Exa + Tavily), v2 con`--intent`/`--queries`/`--freshness`|
| `content-extract`| Skill | Extracción de alta fidelidad (degradación para sitios anti-bot) |