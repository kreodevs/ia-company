---
name: skill-creator
description: Guía para la creación de habilidades efectivas. Esta habilidad debe usarse cuando los usuarios quieran crear una nueva habilidad (o actualizar una habilidad existente) que amplíe las capacidades de Claude con conocimientos especializados, flujos de trabajo o integraciones de herramientas.
license: Complete terms in LICENSE.txt
---

# Creador de habilidades

Esta habilidad proporciona orientación para crear habilidades efectivas.

## Acerca de las habilidades

Las habilidades son paquetes modulares e independientes que amplían las capacidades de Claude al proporcionar
conocimientos especializados, flujos de trabajo y herramientas. Piense en ellas como "guías de incorporación" para temas específicos.
dominios o tareas: transforman a Claude de un agente de propósito general a un agente especializado
equipado con conocimientos procesales que ningún modelo puede poseer por completo.

### Qué habilidades proporcionan

1. Flujos de trabajo especializados: procedimientos de varios pasos para dominios específicos
2. Integraciones de herramientas: instrucciones para trabajar con formatos de archivo o API específicos
3. Experiencia en el dominio: conocimientos, esquemas y lógica empresarial específicos de la empresa.
4. Recursos incluidos: guiones, referencias y recursos para tareas complejas y repetitivas

## Principios básicos

### Conciso es clave

La ventana de contexto es un bien público. Las habilidades comparten la ventana de contexto con todo lo que Claude necesita: aviso del sistema, historial de conversaciones, metadatos de otras habilidades y la solicitud del usuario real.

**Supuesto predeterminado: Claude ya es muy inteligente.** Solo agregue contexto que Claude aún no tenga. Cuestione cada dato: "¿Claude realmente necesita esta explicación?" y "¿Este párrafo justifica su costo simbólico?"

Prefiera ejemplos concisos a explicaciones detalladas.

### Establecer grados de libertad apropiados

Haga coincidir el nivel de especificidad con la fragilidad y variabilidad de la tarea:

**Alta libertad (instrucciones basadas en texto)**: Úselo cuando sean válidos varios enfoques, las decisiones dependan del contexto o la heurística guíe el enfoque.

**Libertad media (pseudocódigo o scripts con parámetros)**: Úselo cuando exista un patrón preferido, alguna variación sea aceptable o la configuración afecte el comportamiento.

**Baja libertad (scripts específicos, pocos parámetros)**: se utiliza cuando las operaciones son frágiles y propensas a errores, la coherencia es crítica o se debe seguir una secuencia específica.

Piense en Claude como si estuviera explorando un camino: un puente estrecho con acantilados necesita barandillas específicas (baja libertad), mientras que un campo abierto permite muchas rutas (alta libertad).

### Anatomía de una habilidad

Cada habilidad consta de un archivo SKILL.md requerido y recursos incluidos opcionales:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   ├── description: (required)
│   │   └── compatibility: (optional, rarely needed)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Documentation intended to be loaded into context as needed
    └── assets/           - Files used in output (templates, icons, fonts, etc.)
```

#### HABILIDAD.md (obligatorio)

Cada SKILL.md consta de:

- **Frontmatter** (YAML): contiene los campos `name` y`description`(obligatorios), además de campos opcionales como` license`,` metadata`y` compatibility`. claude solo lee` name`y` description`para determinar cuándo se activa la habilidad, así que sea claro y comprensivo acerca de qué es la habilidad y cuándo debe usarse. El campo` compatibility`es para anotar los requisitos del entorno (producto de destino, paquetes de sistema, etc.), pero la mayoría de las habilidades no lo necesitan.
- **Cuerpo** (Markdown): Instrucciones y orientación para usar la habilidad. Solo se carga DESPUÉS de que se active la habilidad (si es que se activa).

#### Recursos incluidos (opcional)

##### Guiones (`scripts/`)

Código ejecutable (Python/Bash/etc.) para tareas que requieren confiabilidad determinista o se reescriben repetidamente.

- **Cuándo incluir**: cuando el mismo código se reescribe repetidamente o se necesita confiabilidad determinista
- **Ejemplo**: `scripts/rotate_pdf.py` para tareas de rotación de PDF
- **Beneficios**: token eficiente, determinista, se puede ejecutar sin cargarlo en contexto
- **Nota**: Es posible que Claude aún tenga que leer los scripts para aplicar parches o realizar ajustes específicos del entorno.

##### Referencias (`references/`)

Documentación y material de referencia destinados a cargarse según sea necesario en contexto para informar el proceso y el pensamiento de Claude.

- **Cuándo incluir**: para documentación a la que Claude debe hacer referencia mientras trabaja
- **Ejemplos**: `references/finance.md` para esquemas financieros,`references/mnda.md` para plantilla de NDA de empresa,`references/policies.md` para las políticas de la empresa,`references/api_docs.md` para especificaciones API
- **Casos de uso**: esquemas de bases de datos, documentación de API, conocimiento del dominio, políticas de la empresa, guías de flujo de trabajo detalladas
- **Beneficios**: Mantiene SKILL.md optimizado y cargado solo cuando Claude determina que es necesario
- **Mejores prácticas**: si los archivos son grandes (>10.000 palabras), incluya patrones de búsqueda grep en SKILL.md
- **Evitar duplicación**: la información debe estar en SKILL.md o en archivos de referencia, no en ambos. Prefiera archivos de referencia para obtener información detallada, a menos que sea realmente fundamental para la habilidad; esto mantiene SKILL.md eficiente y al mismo tiempo hace que la información sea reconocible sin acaparar la ventana de contexto. Mantenga sólo las instrucciones de procedimiento esenciales y la guía de flujo de trabajo en SKILL.md; mueva material de referencia detallado, esquemas y ejemplos a archivos de referencia.

##### Activos (`assets/`)Los archivos no están destinados a cargarse en contexto, sino que se usan dentro del resultado que produce Claude.

- **Cuándo incluir**: cuando la habilidad necesita archivos que se utilizarán en el resultado final
- **Ejemplos**: `assets/logo.png` para recursos de marca,`assets/slides.pptx` para plantillas de PowerPoint,`assets/frontend-template/` para texto estándar de HTML/React,`assets/font.ttf` para tipografía
- **Casos de uso**: plantillas, imágenes, íconos, código repetitivo, fuentes, documentos de muestra que se copian o modifican
- **Beneficios**: Separa los recursos de salida de la documentación, permite a Claude usar archivos sin cargarlos en contexto

#### Qué no incluir en una habilidad

Una habilidad solo debe contener archivos esenciales que respalden directamente su funcionalidad. NO cree documentación superflua ni archivos auxiliares, incluidos:

- LÉAME.md
- INSTALLATION_GUIDE.md
- QUICK_REFERENCE.md
- CAMBIOLOG.md
-etc.

La habilidad sólo debe contener la información necesaria para que un agente de IA realice el trabajo en cuestión. No debe contener contexto auxiliar sobre el proceso que se llevó a cabo para crearlo, procedimientos de configuración y prueba, documentación para el usuario, etc. La creación de archivos de documentación adicionales solo agrega desorden y confusión.

### Principio de diseño de divulgación progresiva

Las habilidades utilizan un sistema de carga de tres niveles para gestionar el contexto de manera eficiente:

1. **Metadatos (nombre + descripción)** - Siempre en contexto (~100 palabras)
2. **SKILL.md body** - Cuando se activa la habilidad (<5k palabras)
3. **Recursos incluidos**: según los necesite Claude (ilimitados porque los scripts se pueden ejecutar sin leerlos en la ventana contextual)

#### Patrones de divulgación progresiva

Mantenga el cuerpo de SKILL.md en lo esencial y menos de 500 líneas para minimizar la sobrecarga del contexto. Divida el contenido en archivos separados cuando se acerque a este límite. Al dividir el contenido en otros archivos, es muy importante hacer referencia a ellos desde SKILL.md y describir claramente cuándo leerlos, para garantizar que el lector de la habilidad sepa que existen y cuándo usarlos.

**Principio clave:** Cuando una habilidad admite múltiples variaciones, marcos u opciones, mantenga solo el flujo de trabajo principal y la guía de selección en SKILL.md. Mueva los detalles específicos de variantes (patrones, ejemplos, configuración) a archivos de referencia separados.

**Patrón 1: Guía de alto nivel con referencias**

```markdown

# Procesamiento PDF

## Inicio rápido

Extract text with pdfplumber:
[code example]

## Funciones avanzadas

- **Form filling**: See [FORMS.md](FORMS.md) for complete guide
- **API reference**: See [REFERENCE.md](REFERENCE.md) for all methods
- **Examples**: See [EXAMPLES.md](EXAMPLES.md) for common patterns
```Claude carga FORMS.md, REFERENCE.md o EXAMPLES.md solo cuando es necesario.

**Patrón 2: organización de dominio específico**

Para habilidades con múltiples dominios, organice el contenido por dominio para evitar cargar contexto irrelevante:

```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── reference/
    ├── finance.md (revenue, billing metrics)
    ├── sales.md (opportunities, pipeline)
    ├── product.md (API usage, features)
    └── marketing.md (campaigns, attribution)
```Cuando un usuario pregunta sobre las métricas de ventas, Claude solo lee sales.md.

De manera similar, para las habilidades que admiten múltiples marcos o variantes, organícelas por variante:

```
cloud-deploy/
├── SKILL.md (workflow + provider selection)
└── references/
    ├── aws.md (AWS deployment patterns)
    ├── gcp.md (GCP deployment patterns)
    └── azure.md (Azure deployment patterns)
```Cuando el usuario elige AWS, Claude solo lee aws.md.

**Patrón 3: Detalles condicionales**

Mostrar contenido básico, enlace a contenido avanzado:

```markdown

# Procesamiento DOCX

## Crear documentos

Use docx-js for new documents. See [DOCX-JS.md](DOCX-JS.md).

## Editar documentos

For simple edits, modify the XML directly.

**For tracked changes**: See [REDLINING.md](REDLINING.md)
**For OOXML details**: See [OOXML.md](OOXML.md)
```Claude lee REDLINING.md u OOXML.md solo cuando el usuario necesita esas funciones.

**Pautas importantes:**

- **Evite referencias profundamente anidadas** - Mantenga las referencias en un nivel de profundidad desde SKILL.md. Todos los archivos de referencia deben vincularse directamente desde SKILL.md.
- **Estructurar archivos de referencia más largos** - Para archivos de más de 100 líneas, incluya una tabla de contenido en la parte superior para que Claude pueda ver el alcance completo durante la vista previa.

## Proceso de creación de habilidades

La creación de habilidades implica estos pasos:

1. Comprender la habilidad con ejemplos concretos
2. Planificar contenidos de habilidades reutilizables (guiones, referencias, recursos)
3. Inicialice la habilidad (ejecute init_skill.py)
4. Edite la habilidad (implemente recursos y escriba SKILL.md)
5. Empaquete la habilidad (ejecute package_skill.py)
6. Iterar según el uso real

Siga estos pasos en orden, omitiéndolos sólo si hay una razón clara por la que no son aplicables.

### Paso 1: Comprender la habilidad con ejemplos concretos

Omita este paso sólo cuando los patrones de uso de la habilidad ya se comprendan claramente. Sigue siendo valioso incluso cuando se trabaja con una habilidad existente.

Para crear una habilidad eficaz, comprenda claramente ejemplos concretos de cómo se utilizará la habilidad. Esta comprensión puede provenir de ejemplos directos de usuarios o de ejemplos generados que se validan con los comentarios de los usuarios.

Por ejemplo, al desarrollar una habilidad de edición de imágenes, las preguntas relevantes incluyen:- "¿Qué funcionalidad debería admitir la habilidad del editor de imágenes? ¿Edición, rotación, algo más?"
- "¿Puedes dar algunos ejemplos de cómo se utilizaría esta habilidad?"
- "Me imagino a los usuarios preguntando cosas como 'Eliminar los ojos rojos de esta imagen' o 'Girar esta imagen'. ¿Hay otras formas en las que imaginas que se utilice esta habilidad?"
- "¿Qué diría un usuario que debería activar esta habilidad?"

Para evitar abrumar a los usuarios, evite hacer demasiadas preguntas en un solo mensaje. Comience con las preguntas más importantes y haga un seguimiento según sea necesario para una mayor eficacia.

Concluya este paso cuando tenga una idea clara de la funcionalidad que debe admitir la habilidad.

### Paso 2: Planificación de los contenidos de las habilidades reutilizables

Para convertir ejemplos concretos en una habilidad efectiva, analice cada ejemplo de la siguiente manera:

1. Considerar cómo ejecutar el ejemplo desde cero.
2. Identificar qué scripts, referencias y activos serían útiles al ejecutar estos flujos de trabajo repetidamente

Ejemplo: al crear una habilidad `pdf-editor` para manejar consultas como "Ayúdame a rotar este PDF", el análisis muestra:

1. Rotar un PDF requiere volver a escribir el mismo código cada vez
2. Sería útil almacenar un script `scripts/rotate_pdf.py` en la habilidad

Ejemplo: al diseñar una habilidad `frontend-webapp-builder` para consultas como "Crearme una aplicación de tareas pendientes" o "Crearme un panel para realizar un seguimiento de mis pasos", el análisis muestra:

1. Escribir una aplicación web frontend requiere el mismo HTML/React estándar cada vez
2. Sería útil almacenar en la habilidad una plantilla `assets/hello-world/` que contenga los archivos estándar del proyecto HTML/React.

Ejemplo: al crear una habilidad `big-query` para manejar consultas como "¿Cuántos usuarios han iniciado sesión hoy?" el análisis muestra:

1. Consultar BigQuery requiere redescubrir los esquemas y las relaciones de las tablas cada vez.
2. Sería útil almacenar un archivo `references/schema.md` que documente los esquemas de las tablas en la habilidad.

Para establecer el contenido de la habilidad, analice cada ejemplo concreto para crear una lista de recursos reutilizables que incluya: guiones, referencias y activos.

### Paso 3: Inicializando la habilidad

En este punto, es hora de crear la habilidad.

Omita este paso solo si la habilidad que se está desarrollando ya existe y es necesaria una iteración o un empaquetado. En este caso, continúe con el siguiente paso.

Al crear una nueva habilidad desde cero, ejecute siempre el script`init_skill.py`. El script genera convenientemente una nueva plantilla de directorio de habilidades que incluye automáticamente todo lo que requiere una habilidad, lo que hace que el proceso de creación de habilidades sea mucho más eficiente y confiable.

Uso:

```bash
scripts/init_skill.py <skill-name> --path <output-directory>
```El guión:

- Crea el directorio de habilidades en la ruta especificada
- Genera una plantilla SKILL.md con el frontmatter adecuado y marcadores de posición TODO
- Crea directorios de recursos de ejemplo:`scripts/`,` references/`y` assets/`- Agrega archivos de ejemplo en cada directorio que se pueden personalizar o eliminar

Después de la inicialización, personalice o elimine el SKILL.md generado y los archivos de ejemplo según sea necesario.

### Paso 4: Editar la habilidad

Al editar la habilidad (recién generada o existente), recuerde que la habilidad se está creando para que la use otra instancia de Claude. Incluya información que sea beneficiosa y no obvia para Claude. Considere qué conocimiento de procedimientos, detalles específicos del dominio o activos reutilizables ayudarían a otra instancia de Claude a ejecutar estas tareas de manera más efectiva.

#### Aprenda patrones de diseño probados

Consulte estas guías útiles según las necesidades de sus habilidades:

- **Procesos de varios pasos**: consulte references/workflows.md para flujos de trabajo secuenciales y lógica condicional.
- **Formatos de salida específicos o estándares de calidad**: consulte references/output-patterns.md para plantillas y patrones de ejemplo.

Estos archivos contienen las mejores prácticas establecidas para un diseño de habilidades eficaz.

#### Comience con contenidos de habilidades reutilizables

Para comenzar la implementación, comience con los recursos reutilizables identificados anteriormente: archivos`scripts/`,` references/`y` assets/`. Tenga en cuenta que este paso puede requerir la intervención del usuario. Por ejemplo, al implementar una habilidad` brand-guidelines`, es posible que el usuario deba proporcionar recursos de marca o plantillas para almacenar en` assets/`, o documentación para almacenar en` references/`.

Los scripts agregados deben probarse ejecutándolos para garantizar que no haya errores y que el resultado coincida con lo esperado. Si hay muchos scripts similares, solo es necesario probar una muestra representativa para garantizar la confianza de que todos funcionan y al mismo tiempo equilibrar el tiempo hasta su finalización.Se deben eliminar todos los archivos y directorios de ejemplo que no sean necesarios para la habilidad. El script de inicialización crea archivos de ejemplo en`scripts/`,` references/`y` assets/`para demostrar la estructura, pero la mayoría de las habilidades no los necesitarán todos.

#### Actualizar SKILL.md

**Pautas de escritura:** Utilice siempre la forma imperativa/infinitiva.

##### Frontasunto

Escriba el front-matter de YAML con `name` y`description`:

-`name`: El nombre de la habilidad.
-`description`: este es el mecanismo de activación principal de tu habilidad y ayuda a Claude a comprender cuándo usarla.
  - Incluya tanto lo que hace la habilidad como desencadenantes/contextos específicos sobre cuándo usarla.
  - Incluya aquí toda la información sobre "cuándo utilizarla". - No en el cuerpo. El cuerpo solo se carga después de activarse, por lo que las secciones "Cuándo usar esta habilidad" en el cuerpo no son útiles para Claude.
  - Descripción de ejemplo para una habilidad`docx`: "Creación, edición y análisis completos de documentos con soporte para seguimiento de cambios, comentarios, preservación de formato y extracción de texto. Úselo cuando Claude necesite trabajar con documentos profesionales (archivos .docx) para: (1) Crear nuevos documentos, (2) Modificar o editar contenido, (3) Trabajar con seguimiento de cambios, (4) Agregar comentarios o cualquier otra tarea de documento".

No incluya ningún otro campo en el frontmatter de YAML.

##### Cuerpo

Escriba instrucciones para usar la habilidad y los recursos incluidos.

### Paso 5: empaquetar una habilidad

Una vez que se completa el desarrollo de la habilidad, se debe empaquetar en un archivo distribuible  .skill que se comparte con el usuario. El proceso de empaquetado valida automáticamente la habilidad primero para garantizar que cumpla con todos los requisitos:

```bash
scripts/package_skill.py <path/to/skill-folder>
```Especificación del directorio de salida opcional:

```bash
scripts/package_skill.py <path/to/skill-folder> ./dist
```El script de empaquetado:

1. **Valida** la habilidad automáticamente, marcando:

   - Formato YAML frontmatter y campos obligatorios
   - Convenciones de nomenclatura de habilidades y estructura de directorios.
   - Descripción completa y calidad.
   - Organización de archivos y referencias de recursos.

2. **Empaquete** la habilidad si se aprueba la validación, creando un archivo  .skill con el nombre de la habilidad (por ejemplo,`my-skill.skill`) que incluya todos los archivos y mantenga la estructura de directorio adecuada para la distribución. El archivo  .skill es un archivo zip con una extensión  .skill.

Si la validación falla, el script informará los errores y saldrá sin crear un paquete. Corrija los errores de validación y ejecute el comando de empaquetado nuevamente.

### Paso 6: Iterar

Después de probar la habilidad, los usuarios pueden solicitar mejoras. A menudo, esto sucede justo después de usar la habilidad, con un nuevo contexto de cómo se desempeñó la habilidad.

**Flujo de trabajo de iteración:**

1. Utilice la habilidad en tareas reales.
2. Note luchas o ineficiencias
3. Identifique cómo se deben actualizar SKILL.md o los recursos incluidos
4. Implemente los cambios y pruebe nuevamente