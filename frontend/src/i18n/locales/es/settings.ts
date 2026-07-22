export const settings = {
  loading: "Cargando configuración…",
  title: "Configuración del tenant",
  llm: {
    title: "Configuración LLM",
    defaultModel: "Modelo predeterminado",
    apiKeyKeepCurrent: "Dejar vacío para mantener la actual",
    maxCostPerRun: "Coste máximo por ejecución (USD)",
    save: "Guardar configuración LLM",
  },
  usage: {
    title: "Uso mensual",
    summary: "{{runs}} ejecuciones · {{tokens}} tokens · ${{cost}} desde {{date}}",
  },
  limits: {
    title: "Límites mensuales",
    maxRuns: "Máx. ejecuciones / mes",
    maxCost: "Máx. coste / mes (USD)",
    maxTokens: "Máx. tokens / mes",
    save: "Guardar límites de uso",
  },
  notifications: {
    title: "Notificaciones",
    subtitle: "Webhook, Slack o email (vía Resend) cuando los workflows completan o fallan.",
    webhookUrl: "URL del webhook",
    slackWebhookUrl: "URL del webhook de Slack",
    emailRecipients: "Destinatarios de email (separados por comas)",
    onComplete: "Al completar",
    onFail: "Al fallar",
    save: "Guardar notificaciones",
  },
  metaSchedule: {
    title: "Empresa autónoma (meta schedule)",
    subtitle:
      "El meta schedule elige dinámicamente workflows de discovery, evaluación, construcción o growth según la fase y el portfolio. Las programaciones fijas abajo son opcionales.",
    orchestratorEvery: "Meta orchestrator · cada {{seconds}}s · {{status}}",
    enable: "Activar meta schedule",
  },
  fixedSchedules: {
    title: "Programaciones de workflow fijas",
    subtitle:
      "Ejecuta un workflow concreto en intervalo usando el consensus como contexto inicial.",
    namePlaceholder: "Nombre de la programación",
    empty: "Aún no hay programaciones.",
    deleteConfirm: "¿Eliminar esta programación?",
    nextRun: " · próxima {{date}}",
    every: "Cada {{seconds}}s · {{status}}",
  },
} as const;
