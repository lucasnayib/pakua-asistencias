import type { MetadataRoute } from "next";

const SITE_URL = "https://attendio.lat";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /admin ya lleva su propio noindex por metadata (login incluido), pero además se
      // bloquea acá el rastreo: es el panel privado de cada escuela. /api no le sirve a
      // ningún crawler.
      disallow: ["/admin", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
