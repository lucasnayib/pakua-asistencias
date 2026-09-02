import bcrypt from "bcryptjs";

const CODE_LENGTH = 6;
export const VERIFICATION_CODE_DURATION_MINUTES = 15;

export function generateVerificationCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

export async function hashVerificationCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyVerificationCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code.trim(), hash);
}
