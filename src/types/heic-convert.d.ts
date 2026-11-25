// heic-convert no trae tipos propios ni hay un paquete @types — ver src/lib/upload.ts, donde
// se usa para convertir las fotos HEIC (formato por default del iPhone) a JPEG al subirlas, ya
// que el navegador/optimizador de imágenes no siempre puede decodificar HEIC directamente.
declare module "heic-convert" {
  type ConvertOptions = {
    buffer: Buffer;
    format: "JPEG" | "PNG";
    quality?: number;
  };

  function convert(options: ConvertOptions): Promise<Buffer>;

  export default convert;
}
