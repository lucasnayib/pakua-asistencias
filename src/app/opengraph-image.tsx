import { ImageResponse } from "next/og";

export const alt = "Pakua Asistencias";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          background: "#040506",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>
          PAKUA
        </div>
        <div style={{ display: "flex", fontSize: 48, color: "#e5484d" }}>Asistencias</div>
        <div style={{ display: "flex", fontSize: 28, color: "#9c9c9d" }}>
          Control de asistencia para escuelas de artes marciales
        </div>
      </div>
    ),
    { ...size }
  );
}
