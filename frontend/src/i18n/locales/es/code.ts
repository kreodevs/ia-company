export const code = {
  title: "Código — {{name}}",
  subtitle:
    "Revisa cada archivo que los agentes han producido. Tú decides cuándo enviar a un repositorio de GitHub.",
  productMemory: "← memoria del producto",
  empty: "Aún no hay archivos. El primer run creará README.md, package.json y src/.",
  pickFile: "Elige un archivo a la izquierda para previsualizarlo.",
  loading: "Cargando archivo…",
  couldNotLoad: "No se pudo cargar el archivo.",
  truncated: "vista previa truncada a 1 MB",
  binaryFile: "Archivo binario — vista previa no disponible.",
  publishTitle: "Publicar en un nuevo repositorio de GitHub",
  publishHelp:
    "El commit inicial se crea localmente y se envía a un repo nuevo de GitHub usando el token de plataforma. El producto pasa a fase Launching.",
  repoName: "Nombre del repositorio",
  visibility: "Visibilidad",
  createRepo: "Crear repo en GitHub",
  commit: "Commit inicial: {{sha}}",
  phaseGate: "Crear repo requiere fase building, launching o growing. Actual: {{phase}}.",
} as const;