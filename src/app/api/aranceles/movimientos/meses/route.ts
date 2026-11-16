import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getMesesConDatos } from "@/lib/aranceles-server";

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const meses = await getMesesConDatos(session.adminId);
  return NextResponse.json({ meses });
}
