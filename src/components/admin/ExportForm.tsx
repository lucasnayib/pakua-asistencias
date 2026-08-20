"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useExportDownload, type ExportFormat } from "@/hooks/useExportDownload";
import { formatTimeRange, getLocalNow } from "@/lib/time";

type ScheduleOption = { id: string; name: string | null; startTime: string; endTime: string };

export function ExportForm({ schedules }: { schedules: ScheduleOption[] }) {
  const today = getLocalNow().date;
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [scheduleId, setScheduleId] = useState("");
  const [format, setFormat] = useState<ExportFormat>("XLSX");
  const { loading, runExport } = useExportDownload();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        runExport({ format, dateFrom, dateTo, scheduleId: scheduleId || undefined });
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <Input type="date" label="Desde" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} required />
      <Input type="date" label="Hasta" value={dateTo} onChange={(e) => setDateTo(e.target.value)} required />
      <Select label="Horario" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} className="w-56">
        <option value="">Todos los horarios</option>
        {schedules.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name ? `${s.name} · ` : ""}
            {formatTimeRange(s.startTime, s.endTime)}
          </option>
        ))}
      </Select>
      <Select label="Formato" value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)} className="w-32">
        <option value="XLSX">Excel</option>
        <option value="PDF">PDF</option>
        <option value="TXT">TXT</option>
      </Select>
      <Button type="submit" loading={loading}>
        Exportar
      </Button>
    </form>
  );
}
