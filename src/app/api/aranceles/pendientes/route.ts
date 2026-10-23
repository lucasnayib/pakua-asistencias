import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { currentMonth } from "@/lib/aranceles-calc";
import { getPendingAranceles } from "@/lib/aranceles-server";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const month = request.nextUrl.searchParams.get("month") || currentMonth();
  const pending = await getPendingAranceles(session.adminId, month);

  return NextResponse.json({ month, pending });
}
