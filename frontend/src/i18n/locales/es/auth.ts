export const auth = {
  login: {
    organizationTab: "Organización",
    superadminTab: "Superadmin",
    organizationTitle: "Inicio de sesión de organización",
    superadminTitle: "Inicio de sesión de superadmin",
    organizationSubtitle: "Inicia sesión con el slug de tu organización y tus credenciales.",
    superadminSubtitle: "Administración de plataforma e impersonación de tenants.",
    tenantSlug: "Slug de la organización",
    tenantSlugPlaceholder: "acme-corp",
    signingIn: "Iniciando sesión…",
    signIn: "Iniciar sesión",
    forgotPassword: "¿Olvidaste tu contraseña?",
  },
  forgotPassword: {
    title: "Restablecer contraseña",
    subtitle:
      "Introduce el slug de tu organización y tu correo. Enviaremos un enlace de restablecimiento si la cuenta existe.",
    tenantSlugPlaceholder: "Slug de la organización",
    emailPlaceholder: "Correo electrónico",
    sendResetLink: "Enviar enlace de restablecimiento",
    backToLogin: "Volver al inicio de sesión",
  },
  resetPassword: {
    missingToken: "Falta el token de restablecimiento.",
    requestNewLink: "Solicitar un nuevo enlace",
    title: "Elige una nueva contraseña",
    newPasswordPlaceholder: "Nueva contraseña (mín. 8 caracteres)",
    confirmPasswordPlaceholder: "Confirmar contraseña",
    passwordsDoNotMatch: "Las contraseñas no coinciden",
    updatePassword: "Actualizar contraseña",
  },
  setup: {
    title: "Crear superadmin",
    subtitle:
      "Aún no existe un superadmin. Crea la primera cuenta para gestionar tenants y la plataforma.",
    passwordMin: "Contraseña (mín. 8 caracteres)",
    creating: "Creando…",
    createSuperadmin: "Crear superadmin",
    alreadyHaveAccount: "¿Ya tienes cuenta?",
    signIn: "Inicia sesión",
  },
} as const;
