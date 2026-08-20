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
});

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const exportFormatSchema = z.enum(["XLSX", "PDF", "TXT"]);

export const exportRequestSchema = z.object({
  format: exportFormatSchema.default("XLSX"),
  dateFrom: z.string().regex(dateRegex),
  dateTo: z.string().regex(dateRegex),
  scheduleId: z.string().min(1).optional(),
});
