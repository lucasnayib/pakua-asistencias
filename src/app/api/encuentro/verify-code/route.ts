import { NextRequest, NextResponse } from "next/server";
import { encuentroVerifyCodeSchema } from "@/lib/validations";
import { setEncuentroUploadCookie } from "@/lib/encuentro-upload-access";
import { isEncuentroUploadsEnabled } from "@/lib/encuentro-env";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";
import { getEventRequestIp, lockoutMessage } from "@/lib/request-ip";
import { logChange } from "@/lib/audit";

export async function POST(request: NextRequest) {
  if (!isEncuentroUploadsEnabled()) {
    return NextResponse.json({ error: "La carga de fotos y videos no está disponible." }, { status: 404 });
  }

  // Clave por IP, no por el código: hay un solo código compartido para todo el evento, así
  // que usarlo de clave dejaría que un asistente bloquee a todos los demás.
  const rateLimitKey = `encuentro-code:${getEventRequestIp(request)}`;

  const status = checkRateLimit(rateLimitKey);
  if (status.locked) {
    return NextResponse.json({ error: lockoutMessage(status.remainingMs) }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = encuentroVerifyCodeSchema.safeParse(body);
  if (!parsed.success) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });
  }

  const expected = process.env.EVENT_UPLOAD_CODE;
  if (!expected || parsed.data.code !== expected) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });
  }

  resetRateLimit(rateLimitKey);
  await setEncuentroUploadCookie();
  await logChange({ actor: "anónimo", action: "ENCUENTRO_UPLOAD_CODE_VERIFIED", entity: "EncuentroUpload" });

  return NextResponse.json({ ok: true });
}
