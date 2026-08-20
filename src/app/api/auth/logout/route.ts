import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { logChange } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  await clearSessionCookie();
  if (session) {
    await logChange({ actor: session.username, action: "LOGOUT", entity: "Admin" });
  }
  return NextResponse.json({ ok: true });
}
