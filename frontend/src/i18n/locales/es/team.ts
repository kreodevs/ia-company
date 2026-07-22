export const team = {
  title: "Equipo — {{tenantName}}",
  subtitle: "Gestiona usuarios que pueden iniciar sesión con el slug {{slug}}",
  adminOnly: "Solo los propietarios y administradores de la organización pueden gestionar usuarios.",
  inviteUser: "Invitar usuario",
  temporaryPassword: "Contraseña temporal",
  member: "Miembro",
  admin: "Admin",
  addUser: "Añadir usuario",
  createFailed: "Error al crear usuario",
  columns: {
    name: "Nombre",
    email: "Correo",
    role: "Rol",
    active: "Activo",
  },
} as const;
