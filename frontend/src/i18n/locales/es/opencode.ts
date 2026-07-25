export const opencode = {
  settings: {
    title: "OpenCode",
    subtitle:
      "Each tenant connects to its own OpenCode server. Feature development delegates implementation there instead of coding locally.",
    enabled: "Delegate implementation to OpenCode",
    baseUrl: "OpenCode base URL",
    username: "Basic Auth username",
    password: "Basic Auth password",
    passwordHint: "Leave blank to keep the current password.",
    defaultAgent: "Default agent (optional)",
    defaultModel: "Default model (optional)",
    projectPath: "Project path on OpenCode server (optional)",
    pollIntervalMs: "Poll interval (ms)",
    maxWaitMs: "Max wait (ms)",
    autoApprovePermissions: "Auto-approve OpenCode permissions",
    save: "Save OpenCode settings",
    test: "Test connection",
    testOk: "Connection OK",
    testFail: "Connection failed",
    configured: "Ready to delegate",
    notConfigured: "Enable OpenCode and set URL + password to delegate implementation",
    platformDisabled:
      "OpenCode está desactivado a nivel plataforma. Pide al superadmin que lo habilite en Admin → Configuración de plataforma → OpenCode.",
    serverReachHint:
      "La prueba de conexión se ejecuta desde el servidor API de Auto-Company, no desde tu navegador. Usa una URL accesible desde ese servidor (localhost solo funciona si OpenCode corre en el mismo contenedor).",
    productHint:
      "Los productos pueden sobreescribir estos defaults del tenant. Al confirmar una delegación puedes ajustarlos por run.",
    tenantDefaultsHint:
      "Los defaults del tenant aplican a todos los productos salvo que el producto defina agente, modelo o ruta propios.",
    tenantDefaultOptional: "Opcional — si vacío, usa el default del servidor OpenCode",
    tenantProjectPathHint:
      "Ruta de workspace en OpenCode. Si un producto no define ruta, usa esta o projects/{slug} si también está vacía.",
  },
  productSettings: {
    title: "OpenCode para este producto",
    subtitle: "Estos ajustes aplican cuando feature-development delega la implementación a OpenCode para este producto.",
    inheritTenant: "Heredar default del tenant",
    effectiveHint: "Efectivo para este producto: agente {{agent}}, modelo {{model}}, ruta {{path}}",
    projectPathHint: "Si vacío, por defecto {{path}} en el servidor OpenCode.",
    save: "Save product OpenCode settings",
    saved: "Saved",
  },
  gate: {
    title: "OpenCode no está configurado",
    body:
      "Este run de feature-development delegaría el código a OpenCode, pero tu tenant no tiene conexión OpenCode. Continúa con agentes locales de Auto-Company o cancela el run.",
    continueLocal: "Continuar con Auto-Company",
    cancelRun: "Cancelar run",
  },
  confirm: {
    title: "Confirmar delegación a OpenCode",
    body:
      "Revisa o cambia la carpeta del proyecto, el modelo y el agente para este run. OpenCode recibirá el brief de implementación abajo.",
    delegate: "Delegar a OpenCode",
  },
  delegated: {
    title: "Delegado a OpenCode",
    body: "La implementación corre en tu servidor OpenCode. El run continuará con QA/DevOps cuando OpenCode termine.",
    session: "ID de sesión",
    status: "Estado de delegación",
    cancel: "Cancelar delegación",
  },
  diff: {
    title: "Resultado OpenCode",
    session: "Sesión",
    stats: "+{{add}} / -{{del}}",
    empty: "Sin diff reportado todavía.",
  },
  history: {
    title: "Historial OpenCode",
    files: "archivos",
    viewRun: "Ver run",
  },
  activeBadge: "OpenCode activo",
  externalImplementation: "Implementación externa en curso",
} as const;
