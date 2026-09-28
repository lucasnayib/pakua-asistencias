import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pakua Asistencias",
    short_name: "Pakua",
    description: "Control de asistencia para escuelas de artes marciales",
    start_url: "/",
    display: "standalone",
    background_color: "#040506",
    theme_color: "#040506",
    icons: [
      { src: "/icon.png", sizes: "any", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
