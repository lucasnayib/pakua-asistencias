/** Envuelve navigator.geolocation en una promesa, con mensajes de error entendibles. Solo para uso en el navegador (componentes cliente). */
export function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Este navegador no soporta geolocalización"));
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      reject(new Error("La ubicación solo funciona por HTTPS o en localhost"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Necesitás dar permiso de ubicación para continuar"));
        } else {
          reject(new Error("No se pudo obtener tu ubicación"));
        }
      },
      { enableHighAccuracy: true, timeout: 15_000 }
    );
  });
}
