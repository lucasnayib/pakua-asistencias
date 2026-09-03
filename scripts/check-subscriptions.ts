import "dotenv/config";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

function logLine(message: string): void {
  const logPath = path.join(process.cwd(), "storage", "check-subscriptions.log");
  mkdirSync(path.dirname(logPath), { recursive: true });
  appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
}

async function main(): Promise<void> {
  const secret = process.env.INTERNAL_CRON_SECRET;
  if (!secret) {
    throw new Error("Falta la variable de entorno INTERNAL_CRON_SECRET");
  }

  const baseUrl = (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/api/internal/check-subscriptions`, {
    method: "POST",
    headers: { "x-cron-secret": secret },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
  }

  logLine(`OK ${JSON.stringify(body)}`);
  console.log("check-subscriptions:", body);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  logLine(`ERROR ${message}`);
  console.error("check-subscriptions falló:", message);
  process.exit(1);
});
