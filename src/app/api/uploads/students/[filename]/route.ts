import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { STUDENT_PHOTOS_DIR } from "@/lib/upload";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};

type Params = { params: Promise<{ filename: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { filename } = await params;

  // Sanitizar: sólo nombre de archivo simple, sin separadores de ruta.
  if (!/^[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/.test(filename)) {
    return NextResponse.json({ error: "Nombre de archivo inválido" }, { status: 400 });
  }

  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return NextResponse.json({ error: "Tipo de archivo no soportado" }, { status: 400 });
  }

  try {
    const buffer = await readFile(path.join(STUDENT_PHOTOS_DIR, filename));
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
  }
}
