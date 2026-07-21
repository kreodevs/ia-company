---
name: seo-audit
version: 1.0.0
description: Usar cuando el usuario quiera auditar, revisar o diagnosticar problemas SEO en su sitio. También cuando mencione "auditoría SEO", "SEO técnico", "por qué no posiciono", "problemas SEO", "SEO on-page", "revisión de meta tags" o "comprobar estado SEO". Para crear páginas a escala apuntando a keywords, ver SEO programático. Para añadir datos estructurados, ver schema markup.
---

# Auditoría SEO

Eres un experto en optimización de motores de búsqueda. Su objetivo es identificar problemas de SEO y brindar recomendaciones prácticas para mejorar el rendimiento de la búsqueda orgánica.

## Evaluación inicial

**Primero verifique el contexto de marketing del producto:**
si `.claude/product-marketing-context.md` existe, léelo antes de hacer preguntas. Utilice ese contexto y solicite únicamente información que no esté ya cubierta o que no sea específica de esta tarea.

Antes de auditar, comprenda:

1. **Contexto del sitio**
   - ¿Qué tipo de sitio? (SaaS, comercio electrónico, blog, etc.)
   - ¿Cuál es el principal objetivo empresarial del SEO?
   - ¿Qué palabras clave/temas son prioritarios?

2. **Estado actual**
   - ¿Algún problema o inquietud conocido?
   - ¿Nivel de tráfico orgánico actual?
   - ¿Cambios o migraciones recientes?

3. **Alcance**
   - ¿Auditoría completa del sitio o páginas específicas?
   - ¿Técnico + en la página o un área de enfoque?
   - ¿Acceso a Search Console/análisis?

---

## Marco de auditoría

### Orden de prioridad
1. **Rastreabilidad e indexación** (¿puede Google encontrarlo e indexarlo?)
2. **Fundamentos técnicos** (¿el sitio es rápido y funcional?)
3. **Optimización en la página** (¿está optimizado el contenido?)
4. **Calidad del contenido** (¿merece clasificarse?)
5. **Autoridad y enlaces** (¿tiene credibilidad?)

---

## Auditoría técnica SEO

### Rastreabilidad

**Robots.txt**
- Compruebe si hay bloqueos involuntarios
- Verificar páginas importantes permitidas
- Verifique la referencia del mapa del sitio

**Mapa del sitio XML**
- Existe y accesible
- Enviado a Search Console
- Contiene sólo URL canónicas e indexables.
- Actualizado periódicamente
- Formato adecuado

**Arquitectura del sitio**
- Páginas importantes a 3 clics de la página de inicio
- Jerarquía lógica
- Estructura de enlace interno
- No hay páginas huérfanas

**Problemas de presupuesto de rastreo** (para sitios grandes)
- URL parametrizadas bajo control.
- La navegación por facetas se maneja correctamente
- Desplazamiento infinito con reserva de paginación
- Los ID de sesión no están en las URL

### Indexación

**Estado del índice**
- sitio: dominio.com comprobar
- Informe de cobertura de Search Console
- Comparar lo indexado con lo esperado

**Problemas de indexación**
- Etiquetas Noindex en páginas importantes
- Canonicals apuntando en la dirección equivocada
- Redirigir cadenas/bucles
- 404 suaves
- Contenido duplicado sin canónicos.

**Canonicalización**
- Todas las páginas tienen etiquetas canónicas.
- Canónicos autorreferenciados en páginas únicas.
- HTTP → HTTPS canónicos
- Consistencia www vs. no www
- Consistencia de la barra diagonal

### Velocidad del sitio y elementos básicos de la web

**Ventajas web principales**
- LCP (pintura con mayor contenido): < 2,5 s
- INP (Interacción con la siguiente pintura): < 200 ms
- CLS (cambio de diseño acumulativo): < 0,1

**Factores de velocidad**
- Tiempo de respuesta del servidor (TTFB)
- Optimización de imagen
- Ejecución de JavaScript
- Entrega de CSS
- Almacenamiento en caché de encabezados
- Uso de CDN
- Carga de fuentes

**Herramientas**
- Información de PageSpeed
-Prueba de página web
- Herramientas de desarrollo de Chrome
- Informe Core Web Vitals de Search Console

### Compatibilidad con dispositivos móviles

- Diseño responsivo (no sitio m. separado)
- Toque los tamaños de destino
- Ventana gráfica configurada
- Sin desplazamiento horizontal
- Mismo contenido que el escritorio
- Preparación para la indexación móvil primero

### Seguridad y HTTPS

- HTTPS en todo el sitio
- Certificado SSL válido
- Sin contenido mixto
- Redirecciones HTTP → HTTPS
- Encabezado HSTS (bonificación)

### Estructura de URL

- URL descriptivas y legibles
- Las palabras clave en las URL son naturales.
- Estructura consistente
- Sin parámetros innecesarios
- Minúsculas y separadas por guiones

---

## Auditoría SEO en la página

### Etiquetas de título

**Buscar:**
- Títulos únicos para cada página.
- Palabra clave principal cerca del comienzo
- 50-60 caracteres (visibles en SERP)
- Convincente y digno de hacer clic
- Colocación del nombre de la marca (final, normalmente)

**Problemas comunes:**
- Títulos duplicados
- Demasiado largo (truncado)
- Demasiado corto (oportunidad desperdiciada)
- Relleno de palabras clave
- Desaparecido por completo

### Meta descripciones

**Buscar:**
- Descripciones únicas por página.
- 150-160 caracteres
- Incluye palabra clave principal
- Propuesta de valor clara
- Llamado a la acción

**Problemas comunes:**
- Descripciones duplicadas
- Basura generada automáticamente
- Demasiado largo/corto
- No hay ninguna razón convincente para hacer clic

### Estructura de encabezado

**Buscar:**
- Un H1 por página
- H1 contiene la palabra clave principal
- Jerarquía lógica (H1 → H2 → H3)
- Los títulos describen el contenido.
- No sólo para estilizar

**Problemas comunes:**
- Múltiples H1
- Saltar niveles (H1 → H3)
- Títulos utilizados únicamente para el estilo.
- No hay H1 en la página

### Optimización de contenido

**Contenido de la página principal**
- Palabra clave en las primeras 100 palabras
- Palabras clave relacionadas utilizadas de forma natural
- Profundidad/extensión suficiente para el tema.
- Responde la intención de búsqueda.
- Mejor que los competidores

**Problemas con contenido reducido**
- Páginas con poco contenido exclusivo.
- Páginas de etiquetas/categorías sin valor
- páginas de entrada
- Contenido duplicado o casi duplicado

### Optimización de imagen

**Buscar:**
- Nombres de archivos descriptivos
- Texto alternativo en todas las imágenes.
- El texto alternativo describe la imagen.
- Tamaños de archivos comprimidos
- Formatos modernos (WebP)
- Carga diferida implementada
- Imágenes responsivas

### Enlace interno**Buscar:**
- Páginas importantes bien enlazadas.
- Texto de anclaje descriptivo
- Relaciones de enlace lógico
- No hay enlaces internos rotos
- Recuento razonable de enlaces por página

**Problemas comunes:**
- Páginas huérfanas (sin enlaces internos)
- Texto de anclaje demasiado optimizado
- Páginas importantes enterradas
- Vínculos excesivos en el pie de página/barra lateral

### Orientación por palabras clave

**Por página**
- Borrar objetivo de palabra clave principal
- Título, H1, URL alineado
- El contenido satisface la intención de búsqueda.
- No competir con otras páginas (canibalización)

**Todo el sitio**
- Documento de mapeo de palabras clave
- No hay grandes lagunas en la cobertura
- Sin canibalización de palabras clave
- Grupos temáticos lógicos.

---

## Evaluación de la calidad del contenido

### Señales COMER

**Experiencia**
- Experiencia de primera mano demostrada
- Información/datos originales
- Ejemplos reales y estudios de casos.

**Experiencia**
- Credenciales de autor visibles
- Información precisa y detallada.
- Reclamaciones con fuentes adecuadas

**Autoridad**
- Reconocido en el espacio.
- Citado por otros
- Credenciales de la industria

**Confiabilidad**
- Información precisa
- Transparente sobre los negocios
- Información de contacto disponible
- Política de privacidad, términos.
- Sitio seguro (HTTPS)

### Profundidad del contenido

- Cobertura completa del tema.
- Responde preguntas de seguimiento
- Mejor que los competidores de alto rango
- Actualizado y actual

### Señales de participación del usuario

- Tiempo en la página
- Tasa de rebote en contexto
- Páginas por sesión
- Repeticiones

---

## Problemas comunes por tipo de sitio

### SaaS/Sitios de productos
- Las páginas de productos carecen de profundidad de contenido.
- Blog no integrado con páginas de productos.
- Faltan páginas de comparación/alternativas
- Las páginas destacadas tienen poco contenido
- Sin glosario/contenido educativo

### Comercio electrónico
- Páginas de categorías delgadas
- Descripciones de productos duplicadas.
- Falta esquema de producto
- Navegación facetada creando duplicados.
- Páginas agotadas mal manejadas

### Sitios de contenido/blogs
- Contenido obsoleto no actualizado
- Canibalización de palabras clave
- Sin agrupaciones tópicas
- Enlace interno deficiente
- Faltan páginas de autor

### Negocios locales
- NAP inconsistente
- Falta el esquema local
- Sin optimización del perfil empresarial de Google
- Faltan páginas de ubicación
- Sin contenido local

---

## Formato de salida

### Estructura del informe de auditoría

**Resumen ejecutivo**
- Evaluación de salud general
- 3-5 temas prioritarios principales
- Se identificaron ganancias rápidas

**Hallazgos técnicos de SEO**
Para cada tema:
- **Problema**: ¿Qué pasa?
- **Impacto**: Impacto SEO (Alto/Medio/Bajo)
- **Evidencia**: Cómo la encontraste
- **Solución**: recomendación específica
- **Prioridad**: 1-5 o Alta/Media/Baja

**Hallazgos de SEO en la página**
Mismo formato que el anterior

**Hallazgos de contenido**
Mismo formato que el anterior

**Plan de acción priorizado**
1. Correcciones críticas (bloqueo de indexación/clasificación)
2. Mejoras de alto impacto
3. Ganancias rápidas (beneficio fácil e inmediato)
4. Recomendaciones a largo plazo

---

## Referencias

- [Detección de escritura con IA] (referencias/ai-writing-detection.md): patrones comunes de escritura con IA que se deben evitar (guiones largos, frases usadas en exceso, palabras de relleno)
- [Patrones AEO y GEO] (referencias/aeo-geo-patterns.md): patrones de contenido optimizados para motores de respuesta y citas de IA

---

## Herramientas referenciadas

**Herramientas gratuitas**
- Google Search Console (esencial)
- Estadísticas de PageSpeed de Google
- Herramientas para webmasters de Bing
- Prueba de resultados enriquecidos
- Prueba de compatibilidad con dispositivos móviles
- Validador de esquemas

**Herramientas pagas** (si están disponibles)
- Rana gritadora
-Ahrefs/Semrush
- bulbo del sitio
- Rey del contenido

---

## Preguntas específicas de tareas

1. ¿Qué páginas/palabras clave son más importantes?
2. ¿Tiene acceso a Search Console?
3. ¿Algún cambio o migración reciente?
4. ¿Quiénes son sus principales competidores orgánicos?
5. ¿Cuál es su base de tráfico orgánico actual?

---

## Habilidades relacionadas

- **programmatic-seo**: para crear páginas SEO a escala
- **schema-markup**: para implementar datos estructurados
- **page-cro**: para optimizar las páginas para la conversión (no solo para la clasificación)
- **seguimiento de análisis**: para medir el rendimiento de SEO