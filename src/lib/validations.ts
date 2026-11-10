import { z } from "zod";
import { getLocalNow } from "@/lib/time";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeWithSecondsRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

// Fecha de nacimiento: "YYYY-MM-DD", no en el futuro, y no más de 120 años atrás (filtra tanto
// los años absurdos de varios dígitos que admite el input nativo como una fecha futura colada
// a mano). Vacío/null sigue siendo válido — el campo es opcional.
const MAX_AGE_YEARS = 120;
const birthDateSchema = z
  .string()
  .trim()
  .max(20)
  .optional()
  .nullable()
  .refine(
    (value) => {
      if (!value) return true;
      if (!dateRegex.test(value)) return false;
      const today = getLocalNow().date;
      if (value > today) return false;
      const minYear = Number(today.slice(0, 4)) - MAX_AGE_YEARS;
      return Number(value.slice(0, 4)) >= minYear;
    },
    { message: "Fecha de nacimiento inválida" }
  );

export const FORMACION_OPTIONS = ["Gym", "Arte Marcial", "Taichi", "Yoga", "Armas de Corte", "Jr"] as const;
const formacionSchema = z.union([z.enum(FORMACION_OPTIONS), z.literal("")]).optional().nullable();

// Letras (con acentos/ñ), espacios, guiones y apóstrofes — cubre nombres compuestos
// ("María José", "D'Angelo") sin permitir etiquetas HTML ni símbolos sueltos.
const nameRegex = /^[\p{L}][\p{L}\s'-]*$/u;
const requiredNameSchema = z
  .string()
  .trim()
  .min(1, "Este campo es obligatorio")
  .max(100)
  .regex(nameRegex, "Solo letras, espacios, guiones y apóstrofes");
const optionalNameSchema = z.string().trim().min(1).max(100).regex(nameRegex, "Solo letras, espacios, guiones y apóstrofes").optional();

export const studentCreateSchema = z.object({
  firstName: requiredNameSchema,
  lastName: requiredNameSchema,
  formacion: formacionSchema,
  graduacion: z.string().trim().max(200).optional().nullable(),
  evaluationDate: z.string().trim().max(20).optional().nullable(),
  graduacionDelivered: z.boolean().optional(),
  graduacionDeliveredAt: z.string().trim().max(20).optional().nullable(),
  dni: z.string().trim().max(20).optional().nullable(),
  birthDate: birthDateSchema,
  orientadorId: z.string().trim().min(1).optional().nullable(),
});

export const studentUpdateSchema = z.object({
  firstName: optionalNameSchema,
  lastName: optionalNameSchema,
  formacion: formacionSchema,
  graduacion: z.string().trim().max(200).optional().nullable(),
  evaluationDate: z.string().trim().max(20).optional().nullable(),
  graduacionDelivered: z.boolean().optional(),
  graduacionDeliveredAt: z.string().trim().max(20).optional().nullable(),
  dni: z.string().trim().max(20).optional().nullable(),
  birthDate: birthDateSchema,
  orientadorId: z.string().trim().min(1).optional().nullable(),
  active: z.boolean().optional(),
});

export const graduationHistoryCreateSchema = z.object({
  graduacion: z.string().trim().min(1, "La graduación es obligatoria").max(200),
  authorizedAt: z.string().trim().max(20).optional().nullable(),
  delivered: z.boolean().optional().default(false),
  deliveredAt: z.string().trim().max(20).optional().nullable(),
});

export const graduationHistoryUpdateSchema = z.object({
  graduacion: z.string().trim().min(1, "La graduación es obligatoria").max(200).optional(),
  authorizedAt: z.string().trim().max(20).optional().nullable(),
  delivered: z.boolean().optional(),
  deliveredAt: z.string().trim().max(20).optional().nullable(),
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

// Solo dígitos y los símbolos habituales de un teléfono (+, espacios, guiones, paréntesis) —
// deja pasar formatos internacionales sin exigir uno exacto, pero rechaza letras sueltas.
const phoneRegex = /^[0-9+\-()\s]{6,30}$/;
const phoneSchema = z.union([z.string().trim().regex(phoneRegex, "Teléfono inválido"), z.literal("")]).optional();

export const orientadorCreateSchema = z.object({
  firstName: requiredNameSchema,
  lastName: requiredNameSchema,
  email: z.union([z.string().trim().email("Email inválido"), z.literal("")]).optional(),
  phone: phoneSchema,
});

export const orientadorUpdateSchema = z.object({
  firstName: optionalNameSchema,
  lastName: optionalNameSchema,
  email: z.union([z.string().trim().email("Email inválido"), z.literal("")]).optional(),
  phone: phoneSchema,
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

export const inactivitySettingsSchema = z.object({
  inactivityDeactivationDays: z.number().int().min(1).max(365).nullable(),
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

export const itineranciaUnlockSchema = z.object({
  code: z.string().min(1),
});

export const itineranciaAccessCodeSchema = z.object({
  code: z.string().trim().min(4, "El código debe tener al menos 4 caracteres").max(50).nullable(),
});

export const itineranciaCategorySchema = z.enum([
  "EVALUACION",
  "SEMINARIO",
  "CURSO",
  "COMPENSATORIOS",
  "CLASES_ESPECIALES",
]);

export const itineranciaLocationSchema = z.enum(["CORDOBA", "ALTA_GRACIA"]);

export const itineranciaActivityUpsertSchema = z
  .object({
    title: z.string().trim().min(1, "El título es obligatorio").max(150),
    description: z.string().trim().max(2000).optional().nullable(),
    category: itineranciaCategorySchema,
    location: itineranciaLocationSchema,
    date: z.string().regex(dateRegex, "Fecha inválida (YYYY-MM-DD)"),
    startTime: z.string().regex(timeRegex, "Hora de inicio inválida (HH:mm)"),
    endTime: z.string().regex(timeRegex, "Hora de fin inválida (HH:mm)"),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "La hora de fin debe ser posterior a la hora de inicio",
    path: ["endTime"],
  });

// latitude/longitude: solo se exigen si la actividad es de sede Córdoba y la escuela tiene
// configurada una restricción de ubicación (ver Admin.latitude/longitude/attendanceRadiusMeters,
// la misma que ya usa la asistencia normal) — la validación real ocurre en el servidor.
export const itineranciaRegisterSchema = z.object({
  activityId: z.string().min(1),
  studentId: z.string().min(1),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const itineranciaClosePeriodSchema = z.object({
  label: z.string().trim().min(1, "La etiqueta es obligatoria").max(150),
});

// clientDate: fecha "de hoy" calculada en el dispositivo del alumno (no en el servidor), para
// no depender de la zona horaria del server al validar que la actividad no sea futura — ver
// getLocalNow() en @/lib/time, ya usado con el mismo propósito en el check-in de clases normales.
export const itineranciaAttendanceMarkSchema = z.object({
  activityId: z.string().min(1),
  studentId: z.string().min(1),
  clientDate: z.string().regex(dateRegex, "Fecha inválida (YYYY-MM-DD)"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const requestEmailChangeSchema = z.object({
  newEmail: z.string().trim().email("Email inválido").max(150),
});

export const requestPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Ingresá tu contraseña actual"),
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const confirmPendingChangeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "El código debe tener 6 dígitos"),
});

export const studentMigrationCodeSchema = z.object({
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

export const exportRequestSchema = z
  .object({
    format: exportFormatSchema.default("XLSX"),
    dateFrom: z.string().regex(dateRegex),
    dateTo: z.string().regex(dateRegex),
    scheduleId: z.string().min(1).optional(),
    // Solo se usa cuando la exportación se pide sin sesión de admin (página pública de check-in).
    adminId: z.string().min(1).optional(),
  })
  .refine((data) => data.dateFrom <= data.dateTo, {
    message: '"Desde" no puede ser posterior a "Hasta"',
    path: ["dateTo"],
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

// Formulario público de registro de escuela nueva (`/admin/login?mode=register`). La cuenta
// se crea con `approved: false`: queda pendiente de revisión del super-admin antes de operar.
export const encuentroVerifyCodeSchema = z.object({
  code: z.string().trim().min(1, "Ingresá el código"),
});

export const encuentroVerifyGalleryTokenSchema = z.object({
  token: z.string().trim().min(1, "Falta el token"),
});

export const encuentroUploadStartSchema = z.object({
  mime: z.string().trim().min(1),
  size: z.number().int().positive(),
});

export const encuentroApproveRejectSchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
  all: z.boolean().optional(),
});

export const encuentroGalleryToggleSchema = z.object({
  enabled: z.boolean(),
});

export const schoolRegistrationSchema = z.object({
  username: z.string().trim().min(1, "El usuario es obligatorio").max(50),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  displayName: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  contactEmail: z.string().trim().email("Email inválido").max(150),
  contactPhone: z.string().trim().min(1, "El teléfono es obligatorio").max(30),
});

// Aranceles (finanzas de la escuela): catálogo de tipos de arancel, inscripción de alumnos,
// pagos mensuales, y un libro de gastos/ingresos sueltos. Ver src/lib/aranceles-calc.ts.
const monthRegex = /^\d{4}-\d{2}$/;

// FEDERACION: cuotas que la escuela cobra para reenviar a la federación — se registran como
// ingreso de categoría FEDERACION pero no son ingreso propio de la escuela, así que se excluyen
// de los totales (ver esIngresoPropio en src/lib/aranceles-calc.ts). Solo sirven de registro.
export const CATEGORIAS_INGRESO = ["CUOTAS", "FEDERACION", "OTROS"] as const;
export const CATEGORIAS_EGRESO = ["ALQUILER", "SERVICIOS", "INSUMOS", "MANTENIMIENTO", "SUELDOS", "OTROS"] as const;

export const tipoArancelCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  amount: z.number().int().min(0, "El monto no puede ser negativo").max(100_000_000),
  categoria: z.enum(CATEGORIAS_INGRESO).default("CUOTAS"),
});

export const tipoArancelUpdateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(100).optional(),
  amount: z.number().int().min(0).max(100_000_000).optional(),
  categoria: z.enum(CATEGORIAS_INGRESO).optional(),
  active: z.boolean().optional(),
});

export const alumnoArancelCreateSchema = z.object({
  tipoArancelId: z.string().trim().min(1),
});

export const pagoArancelMarkPaidSchema = z.object({
  month: z.string().regex(monthRegex, "Mes inválido (YYYY-MM)"),
});

export const movimientoFinancieroCreateSchema = z
  .object({
    tipo: z.enum(["INGRESO", "EGRESO"]),
    categoria: z.string().trim().min(1),
    concepto: z.string().trim().min(1, "El concepto es obligatorio").max(200),
    amount: z.number().int().min(1, "El monto debe ser mayor a 0").max(100_000_000),
    date: z.string().regex(dateRegex, "Fecha inválida (YYYY-MM-DD)"),
    estado: z.enum(["PAGADO", "NO_PAGADO"]).default("PAGADO"),
  })
  .refine(
    (v) =>
      (v.tipo === "INGRESO" ? (CATEGORIAS_INGRESO as readonly string[]) : (CATEGORIAS_EGRESO as readonly string[])).includes(
        v.categoria
      ),
    { message: "Categoría inválida para ese tipo", path: ["categoria"] }
  );

export const movimientoFinancieroUpdateSchema = z.object({
  tipo: z.enum(["INGRESO", "EGRESO"]).optional(),
  categoria: z.string().trim().min(1).optional(),
  concepto: z.string().trim().min(1).max(200).optional(),
  amount: z.number().int().min(1).max(100_000_000).optional(),
  date: z.string().regex(dateRegex, "Fecha inválida (YYYY-MM-DD)").optional(),
  estado: z.enum(["PAGADO", "NO_PAGADO"]).optional(),
});

// Solicitud de borrado de un movimiento/pago ya protegido por tener un recibo exportado (ver
// AdminRequest en el schema). La razón es obligatoria: es lo único que ve el superadmin para
// decidir si aprueba o rechaza.
export const solicitarBorradoMovimientoSchema = z.object({
  id: z.string().trim().min(1),
  reason: z.string().trim().min(5, "Contá brevemente por qué hay que borrarlo").max(500),
});

export const resolverSolicitudSchema = z.object({
  action: z.enum(["APROBAR", "RECHAZAR"]),
  note: z.string().trim().max(500).optional(),
});
