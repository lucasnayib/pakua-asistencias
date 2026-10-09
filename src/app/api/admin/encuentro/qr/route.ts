import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET() {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const code = process.env.EVENT_UPLOAD_CODE;
  if (!code) {
    return NextResponse.json({ error: "EVENT_UPLOAD_CODE no está configurado" }, { status: 400 });
  }

  const base = process.env.APP_BASE_URL ?? "https://attendio.lat";
  const url = `${base}/encuentro?c=${encodeURIComponent(code)}`;
  const dataUrl = await QRCode.toDataURL(url);

  return NextResponse.json({ dataUrl, url });
}
