import { MercadoPagoConfig } from "mercadopago";

function getAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("Falta la variable de entorno MP_ACCESS_TOKEN");
  return token;
}

let client: MercadoPagoConfig | null = null;

// Perezoso a propósito: si esto se creara al importar el módulo (como una simple
// `export const mpClient = new MercadoPagoConfig(...)`), Next.js rompe el build entero al
// recolectar datos de las rutas apenas falte MP_ACCESS_TOKEN — incluso con
// SUBSCRIPTIONS_ENABLED="false", que es justo el caso mientras no se cargó ninguna
// credencial todavía.
export function getMpClient(): MercadoPagoConfig {
  if (!client) {
    client = new MercadoPagoConfig({ accessToken: getAccessToken() });
  }
  return client;
}
