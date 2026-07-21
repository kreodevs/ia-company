# Patrones de salida

Utilice estos patrones cuando las habilidades necesiten producir resultados consistentes y de alta calidad.

## Patrón de plantilla

Proporcione plantillas para el formato de salida. Adapte el nivel de rigor a sus necesidades.

**Para requisitos estrictos (como respuestas API o formatos de datos):**

```markdown

## Estructura del informe

USAR SIEMPRE esta estructura exacta de plantilla:

# [Analysis Title]

## Resumen ejecutivo
[Resumen de un párrafo de hallazgos clave]

## Hallazgos clave
- Hallazgo 1 con datos de soporte
- Hallazgo 2 con datos de soporte
- Hallazgo 3 con datos de soporte

## Recomendaciones
1. Recomendación accionable específica
2. Recomendación accionable específica
```**Para orientación flexible (cuando la adaptación es útil):**

```markdown

## Estructura del informe

Formato predeterminado razonable; usar criterio propio:

# [Analysis Title]

## Resumen ejecutivo
[Overview]

## Hallazgos clave
[Adaptar secciones según lo descubierto]

## Recomendaciones
[Ajustar al contexto específico]

Ajustar secciones según el tipo de análisis.
```

## Patrón de ejemplos

Para habilidades donde la calidad del resultado depende de ver ejemplos, proporcione pares de entrada/salida:

```markdown

## Formato de mensaje de commit

Generar mensajes de commit siguiendo estos ejemplos:

**Ejemplo 1:**
Entrada: Autenticación de usuario añadida con tokens JWT
Salida:
```hazaña (auth): implementar autenticación basada en JWT

Agregar punto final de inicio de sesión y middleware de validación de tokens

```

**Ejemplo 2:**
Entrada: Corregido bug donde las fechas se mostraban incorrectamente en informes
Salida:
```corrección (informes): formato de fecha correcto en la conversión de zona horaria

Utilice marcas de tiempo UTC de manera consistente durante la generación de informes

```

Seguir este estilo: type(scope): descripción breve, luego explicación detallada.
```Los ejemplos ayudan a Claude a comprender el estilo deseado y el nivel de detalle con mayor claridad que las descripciones por sí solas.