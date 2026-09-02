import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeWithSecondsRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export const studentCreateSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  lastName: z.string().trim().min(1, "El apellido es obligatorio").max(100),
});

export const studentUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  active: z.boolean().optional(),
});

export const scheduleSchema = z.object({
  name: z.string().trim().max(100).optional().nullable(),
  startTime: z.string().regex(timeRegex, "Hora de inicio inválida (HH:mm)"),
  endTime: z.string().regex(timeRegex, "Hora de fin inválida (HH:mm)"),
  days: z.array(z.number().int().min(0).max(6)).min(1, "Elegí al menos un día"),
}).refine((data) => data.endTime > data.startTime, {
  message: "La hora de fin debe ser posterior a la hora de inicio",
  path: ["endTime"],
});

export const assignmentSchema = z.object({
  studentId: z.string().min(1),
  scheduleId: z.string().min(1),
});

export const orientadorCreateSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  lastName: z.string().trim().min(1, "El apellido es obligatorio").max(100),
  email: z.union([z.string().trim().email("Email inválido"), z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
});

export const orientadorUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  email: z.union([z.string().trim().email("Email inválido"), z.literal("")]).optional(),
  phone: z.string().trim().max(30).optional(),
  active: z.boolean().optional(),
});

export const studentIdsSchema = z.array(z.string().min(1));

export const attendanceCreateSchema = z.object({
  studentId: z.string().min(1),
  scheduleId: z.string().min(1),
  date: z.string().regex(dateRegex, "Fecha inválida (YYYY-MM-DD)"),
  time: z.string().regex(timeWithSecondsRegex, "Hora inválida"),
  // Ubicación del dispositivo que marca la asistencia. Solo se exige si la escuela tiene
  // configurada una restricción de ubicación (ver /api/attendance).
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const locationSettingsSchema = z.object({
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  attendanceRadiusMeters: z.number().int().min(10).max(5000).nullable(),
});

export const geocodeAddressSchema = z.object({
  address: z.string().trim().min(3, "Ingresá una dirección").max(300),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const schoolUnlockSchema = z.object({
  password: z.string().min(1),
});

export const requestEmailChangeSchema = z.object({
  newEmail: z.string().trim().email("Email inválido").max(150),
});

export const requestPasswordChangeSchema = z.object({
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const confirmPendingChangeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "El código debe tener 6 dígitos"),
});

export const forgotPasswordSchema = z.object({
  username: z.string().trim().min(1),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const twoFactorVerifySchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().trim().min(6, "Ingresá el código completo").max(20),
});

export const twoFactorConfirmSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "El código debe tener 6 dígitos"),
});

export const exportFormatSchema = z.enum(["XLSX", "PDF", "TXT"]);

export const exportRequestSchema = z.object({
  format: exportFormatSchema.default("XLSX"),
  dateFrom: z.string().regex(dateRegex),
  dateTo: z.string().regex(dateRegex),
  scheduleId: z.string().min(1).optional(),
  // Solo se usa cuando la exportación se pide sin sesión de admin (página pública de check-in).
  adminId: z.string().min(1).optional(),
});

// No existe selector de rol en ninguna UI ni endpoint: el único SUPER_ADMIN se crea por seed
// y esa cuenta no se puede promover ni degradar desde acá. Toda cuenta creada u editada desde
// /admin/admins es siempre "ADMIN".
const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const slugSchema = z
  .string()
  .trim()
  .min(3, "La dirección debe tener al menos 3 caracteres")
  .max(50, "La dirección no puede superar los 50 caracteres")
  .regex(slugRegex, "Solo minúsculas, números y guiones (ej: mi-escuela)");

export const adminCreateSchema = z.object({
  username: z.string().trim().min(1, "El usuario es obligatorio").max(50),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  displayName: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  slug: slugSchema,
});

// Sin "password" ni "contactEmail"/"contactPhone": el super-admin no puede cambiarle la
// contraseña ni el mail/teléfono de contacto a otra cuenta desde acá — eso lo maneja cada
// admin por su cuenta, con verificación por mail (ver /api/admin/contact-email y
// /api/admin/password).
export const adminUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  slug: slugSchema.optional(),
  active: z.boolean().optional(),
  approved: z.boolean().optional(),
});

// Formulario público de registro de escuela nueva (`/registrar-escuela`). La cuenta se crea
// con `approved: false`: queda pendiente de revisión del super-admin antes de poder operar.
export const schoolRegistrationSchema = z.object({
  username: z.string().trim().min(1, "El usuario es obligatorio").max(50),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  displayName: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  contactEmail: z.string().trim().email("Email inválido").max(150),
  contactPhone: z.string().trim().min(1, "El teléfono es obligatorio").max(30),
});
