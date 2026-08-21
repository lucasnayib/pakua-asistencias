"use client";

import { Button } from "@/components/ui/Button";
import { useExportDownload, type ExportFormat } from "@/hooks/useExportDownload";

type ExportButtonProps = {
  format?: ExportFormat;
  dateFrom: string;
  dateTo: string;
  scheduleId?: string;
  adminId?: string;
  label?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

export function ExportButton({
  format = "XLSX",
  dateFrom,
  dateTo,
  scheduleId,
  adminId,
  label = "Exportar asistencias",
  variant = "secondary",
}: ExportButtonProps) {
  const { loading, runExport } = useExportDownload();

  return (
    <Button
      variant={variant}
      onClick={() => runExport({ format, dateFrom, dateTo, scheduleId, adminId })}
      loading={loading}
    >
      {label}
    </Button>
  );
}
