import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = "https://attendio.lat";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const schools = await prisma.admin.findMany({
    where: { active: true, role: "ADMIN" },
    select: { slug: true, createdAt: true },
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/registrar-escuela`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terminos`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const schoolRoutes: MetadataRoute.Sitemap = schools.map((school) => ({
    url: `${SITE_URL}/escuela/${school.slug}`,
    lastModified: school.createdAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...schoolRoutes];
}
