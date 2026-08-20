import { formatDateEs, formatTimeShort } from "@/lib/time";
import type { ExportRow } from "@/lib/export/types";

export function buildTxtContent(rows: ExportRow[]): string {
  return rows
    .map((r) =>
      [
        `${r.firstName} ${r.lastName}`,
        formatDateEs(r.date),
        formatTimeShort(r.time),
        r.scheduleLabel,
        r.status === "PRESENTE" ? "Presente" : r.status,
      ].join("\n")
    )
    .join("\n\n");
}
