export const workflowDisplay = {
  stepFallback: "Paso",
  steps_one: "{{count}} paso",
  steps_other: "{{count}} pasos",
  connections_one: "{{count}} conexión",
  connections_other: "{{count}} conexiones",
  moreSteps: "+{{count}} más",
  pipelineAriaLabel: "Pipeline de agentes",
  titles: {
    "opportunity-discovery": "Descubrimiento de oportunidades",
    "new-product-evaluation": "Evaluación de nuevo producto",
    "feature-development": "Desarrollo de funcionalidades",
    "product-launch": "Lanzamiento de producto",
    "pricing-and-monetization": "Precios y monetización",
  },
  descriptions: {
    "opportunity-discovery": "Brainstorm de ideas → pipeline",
    "new-product-evaluation": "Evaluar idea → GO / NO-GO",
    "feature-development": "Implementar en projects/{slug}/",
    "product-launch": "Lanzamiento y growth",
    "pricing-and-monetization": "Pricing y monetización",
  },
} as const;
