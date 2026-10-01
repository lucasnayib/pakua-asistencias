import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const STUDENT_MIGRATION_DURATION_DAYS = 7;

/**
 * sha256 del código, no bcrypt: hace falta poder buscarlo por índice sin saber de antemano a
 * qué alumno pertenece (con bcrypt solo se puede escanear y comparar uno por uno). Con un
 * espacio de 6 dígitos, bcrypt no suma protección real contra fuerza bruta — la protección
 * real es el rate limit — mismo criterio que passwordFingerprint en src/lib/auth.ts.
 */
export function hashMigrationCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

/** Busca una migración viva (pendiente y sin vencer) por el código en texto plano. */
export function findLiveMigrationByCode(code: string) {
  return prisma.studentMigration.findFirst({
    where: { codeHash: hashMigrationCode(code), status: "PENDING", expiresAt: { gt: new Date() } },
    include: { student: { include: { admin: true, graduationHistory: true } } },
  });
}
