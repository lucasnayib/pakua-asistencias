import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";

const ISSUER = "Pakua Asistencias";
const BACKUP_CODE_COUNT = 10;

export function generateTotpSecret(): string {
  return generateSecret();
}

export async function generateQrDataUrl(username: string, secret: string): Promise<string> {
  const otpauthUrl = generateURI({ issuer: ISSUER, label: username, secret });
  return QRCode.toDataURL(otpauthUrl);
}

export async function verifyTotpToken(token: string, secret: string): Promise<boolean> {
  try {
    // epochTolerance: 30s de margen para relojes ligeramente desincronizados entre el
    // celular y el servidor — estándar para la mayoría de las implementaciones de 2FA.
    const result = await verify({ secret, token, epochTolerance: 30 });
    return result.valid;
  } catch {
    return false;
  }
}

/** Códigos de respaldo de un solo uso: 8 caracteres alfanuméricos, legibles a mano. */
function generateBackupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para evitar confusión
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, generateBackupCode);
}

export async function hashBackupCodes(codes: string[]): Promise<string> {
  const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
  return JSON.stringify(hashes);
}

/**
 * Compara `code` contra la lista de hashes guardados. Si coincide, devuelve la lista de
 * hashes restante (sin el usado, para invalidarlo) y `true`. Si no coincide con ninguno,
 * devuelve `false` y la lista original sin tocar.
 */
export async function consumeBackupCode(
  code: string,
  storedHashesJson: string | null
): Promise<{ valid: boolean; remainingHashesJson: string }> {
  if (!storedHashesJson) return { valid: false, remainingHashesJson: storedHashesJson ?? "[]" };
  const hashes: string[] = JSON.parse(storedHashesJson);
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(code.trim().toUpperCase(), hashes[i])) {
      const remaining = [...hashes.slice(0, i), ...hashes.slice(i + 1)];
      return { valid: true, remainingHashesJson: JSON.stringify(remaining) };
    }
  }
  return { valid: false, remainingHashesJson: storedHashesJson };
}
