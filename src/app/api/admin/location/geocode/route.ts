import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { geocodeAddressSchema } from "@/lib/validations";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rate-limit";
import { geocodeAddress } from "@/lib/geocoding";

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = geocodeAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dirección inválida" }, { status: 400 });
  }

  // Nominatim pide no pasarse de 1 consulta por segundo — este rate-limit (5 cada 15 min)
  // ya alcanza de sobra para eso, además de evitar abuso desde una misma cuenta.
  const rateLimitKey = `geocode:${session.adminId}`;
  const status = checkRateLimit(rateLimitKey);
  if (status.locked) {
    return NextResponse.json({ error: "Demasiadas búsquedas. Probá de nuevo en unos minutos." }, { status: 429 });
  }
  recordFailedAttempt(rateLimitKey);

  const result = await geocodeAddress(parsed.data.address);
  if (!result) {
    return NextResponse.json(
      { error: "No se pudo encontrar esa dirección. Probá ser más específico, o cargá las coordenadas a mano." },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
