import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { NextRequest } from "next/server";

/**
 * Streamea un archivo con soporte de Range (206, para que el navegador pueda hacer seek en
 * un video sin descargarlo entero). No hay nada parecido en el resto del repo ni en los docs
 * de Next 16 incluidos en node_modules — es código nuevo sobre las APIs crudas de Node.
 */
export async function streamMediaFile(
  request: NextRequest,
  filePath: string,
  mime: string,
  size: number
): Promise<Response> {
  const range = request.headers.get("range");

  if (!range) {
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private",
      },
    });
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;
  return new Response(stream, {
    status: 206,
    headers: {
      "Content-Type": mime,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private",
    },
  });
}
