import { NextRequest, NextResponse } from "next/server";
import { encuentroVerifyGalleryTokenSchema } from "@/lib/validations";
import { setEncuentroGalleryCookie } from "@/lib/encuentro-gallery-access";
import { readEncuentroConfig } from "@/lib/encuentro-config";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";
import { getEventRequestIp, lockoutMessage } from "@/lib/request-ip";
import { logChange } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const rateLimitKey = `encuentro-gallery:${getEventRequestIp(request)}`;

  const status = checkRateLimit(rateLimitKey);
  if (status.locked) {
    return NextResponse.json({ error: lockoutMessage(status.remainingMs) }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = encuentroVerifyGalleryTokenSchema.safeParse(body);
  if (!parsed.success) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: "Link inválido" }, { status: 401 });
  }

  const config = await readEncuentroConfig();
  if (!config.galleryEnabled || !config.galleryToken || parsed.data.token !== config.galleryToken) {
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: "Link inválido" }, { status: 401 });
  }

  resetRateLimit(rateLimitKey);
  await setEncuentroGalleryCookie(config.galleryToken);
  await logChange({ actor: "anónimo", action: "ENCUENTRO_GALLERY_TOKEN_VERIFIED", entity: "EncuentroGallery" });

  return NextResponse.json({ ok: true });
}
