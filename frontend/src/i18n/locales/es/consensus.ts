export const consensus = {
  loading: "Cargando consensus…",
  title: "Memoria de la Compañía",
  subtitle:
    "Baton transversal: fase de la compañía, pipeline, revenue total. La memoria por producto vive en la página de cada producto.",
  viewOpsDashboard: "Ver panel de operaciones →",
  nextAction: "Next Action",
  nextActionPlaceholder: "¿En qué debe centrarse el próximo ciclo?",
  document: "Documento",
  saveConsensus: "Guardar consensus",
  lastUpdated: "Última actualización {{date}}",
  noChangesToSave: "Sin cambios para guardar.",
  companyHelp:
    "Memoria a nivel compañía: fase, pipeline y next action. El detalle por producto vive en la página de cada producto.",
  backToCompany: "← Memoria de la compañía",
  productMemoryHeading: "Memoria por producto",
  productTab: "Documento",
  productTitle: "Memoria del producto: {{name}}",
  productSubtitle:
    "Consensus por producto: una revisión por entrega de agente. Usa el bloque JSON en tu salida para registrar decisiones, preguntas abiertas y vetos.",
  productHelp:
    "Esta es la memoria del producto. Las ediciones manuales reemplazan el documento; las entregas de agentes se registran en la pestaña Revisions.",
  revisionsTitle: "Revisiones",
  noRevisions: "Aún no hay revisiones. El primer ciclo creará una.",
  noRevisionsTitle: "Sin revisiones",
  veto: "VETO",
  openQuestions: "Preguntas abiertas:",
  viewRawContent: "Ver contenido crudo de la revisión",
  cycleNumber: "Ciclo {{n}}",
  viewCode: "Ver código →",
  scope: {
    label: "Mostrar memoria de",
    helper:
      "Elige un alcance para inspeccionar. Elegir un producto u oportunidad salta a la memoria de ese producto.",
    company: "Compañía (transversal)",
    product: "{{name}} ({{slug}})",
    ideaOnly: "Oportunidad — {{title}}",
    ideaWithProduct: "Oportunidad — {{title}} → {{product}}",
  },
} as const;
