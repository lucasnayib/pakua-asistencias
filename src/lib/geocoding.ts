export type GeocodeResult = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

// Nominatim exige un User-Agent identificable en cada request (no lo pide como opcional:
// sin esto, puede bloquear las consultas). Ver política de uso:
// https://operations.osmfoundation.org/policies/nominatim/
const USER_AGENT = "PakuaAsistencias/1.0 (contacto: pakuaasistencias@gmail.com)";

/**
 * Convierte una dirección en texto ("Av. Colón 1234, Córdoba") a coordenadas, usando
 * Nominatim (OpenStreetMap) — gratis, sin API key ni tarjeta. Devuelve `null` si la
 * dirección no se pudo resolver o si el servicio falló.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });
  } catch (error) {
    console.error("No se pudo consultar Nominatim:", error);
    return null;
  }

  if (!response.ok) return null;

  const results = await response.json().catch(() => null);
  const result = results?.[0];
  if (!result) return null;

  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  return {
    latitude,
    longitude,
    formattedAddress: result.display_name ?? address,
  };
}
