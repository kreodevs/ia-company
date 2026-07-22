export const auth = {
  login: {
    organizationTab: "Organization",
    superadminTab: "Superadmin",
    organizationTitle: "Organization Login",
    superadminTitle: "Superadmin Login",
    organizationSubtitle: "Sign in with your organization slug and credentials.",
    superadminSubtitle: "Platform administration and tenant impersonation.",
    tenantSlug: "Organization slug",
    tenantSlugPlaceholder: "acme-corp",
    signingIn: "Signing in…",
    signIn: "Sign in",
    forgotPassword: "Forgot password?",
  },
  forgotPassword: {
    title: "Reset password",
    subtitle:
      "Enter your organization slug and email. We will send a reset link if the account exists.",
    tenantSlugPlaceholder: "Organization slug",
    emailPlaceholder: "Email",
    sendResetLink: "Send reset link",
    backToLogin: "Back to login",
  },
  resetPassword: {
    missingToken: "Missing reset token.",
    requestNewLink: "Request a new link",
    title: "Choose a new password",
    newPasswordPlaceholder: "New password (min 8 chars)",
    confirmPasswordPlaceholder: "Confirm password",
    passwordsDoNotMatch: "Passwords do not match",
    updatePassword: "Update password",
  },
  setup: {
    title: "Create Superadmin",
    subtitle:
      "No superadmin exists yet. Create the first account to manage tenants and the platform.",
    passwordMin: "Password (min 8 characters)",
    creating: "Creating…",
    createSuperadmin: "Create superadmin",
    alreadyHaveAccount: "Already have an account?",
    signIn: "Sign in",
  },
} as const;
