"use client";

import { useState } from "react";
import { toast } from "sonner";

export type ExportFormat = "XLSX" | "PDF" | "TXT";

export type ExportParams = {
  format?: ExportFormat;
  dateFrom: string;
  dateTo: string;
  scheduleId?: string;
  adminId?: string;
};

export function useExportDownload() {
  const [loading, setLoading] = useState(false);

  async function runExport({ format = "XLSX", dateFrom, dateTo, scheduleId, adminId }: ExportParams): Promise<boolean> {
    setLoading(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, dateFrom, dateTo, scheduleId, adminId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo generar la exportación");
        return false;
      }

      const blob = await res.blob();
      const filename = res.headers.get("X-Filename") ?? `asistencias.${format.toLowerCase()}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      const uploadedToDrive = res.headers.get("X-Drive-Uploaded") === "1";
      toast.success(
        uploadedToDrive ? "Exportación descargada y subida a Google Drive" : "Exportación descargada correctamente"
      );
      return true;
    } catch {
      toast.error("Error de conexión al exportar");
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { loading, runExport };
}
