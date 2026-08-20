"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { formatTimeRange, getLocalNow } from "@/lib/time";
import type { RosterResponse, ScheduleListItem, StudentListItem } from "@/types";

export default function AsignacionesAdminPage() {
  const [schedules, setSchedules] = useState<ScheduleListItem[]>([]);
  const [scheduleId, setScheduleId] = useState("");
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/schedules")
      .then((res) => res.json())
      .then((data) => {
        setSchedules(data.schedules ?? []);
        if (data.schedules?.length) setScheduleId(data.schedules[0].id);
      });
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => setStudents(data.students ?? []));
  }, []);

  const loadAssigned = useCallback(() => {
    if (!scheduleId) return;
    setLoading(true);
    const today = getLocalNow().date;
    fetch(`/api/schedules/${scheduleId}/roster?date=${today}`)
      .then((res) => res.json())
      .then((data: RosterResponse) => setAssignedIds(new Set((data.roster ?? []).map((r) => r.id))))
      .finally(() => setLoading(false));
  }, [scheduleId]);

  useEffect(() => {
    loadAssigned();
  }, [loadAssigned]);

  async function toggleAssignment(student: StudentListItem, assigned: boolean) {
    setPendingId(student.id);
    try {
      const res = await fetch("/api/assignments", {
        method: assigned ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id, scheduleId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo actualizar la asignación");
        return;
      }
      setAssignedIds((current) => {
        const next = new Set(current);
        if (assigned) next.delete(student.id);
        else next.add(student.id);
        return next;
      });
    } finally {
      setPendingId(null);
    }
  }

  const filteredStudents = students.filter((s) =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Asignaciones</h1>
        <p className="text-sm text-muted-foreground">Elegí un horario y marcá qué alumnos lo cursan.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select label="Horario" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} className="w-64">
          {schedules.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name ? `${s.name} · ` : ""}
              {formatTimeRange(s.startTime, s.endTime)}
            </option>
          ))}
        </Select>
        <Input
          label="Buscar alumno"
          placeholder="Nombre o apellido…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Cargando…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((s) => {
            const assigned = assignedIds.has(s.id);
            return (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                  assigned ? "border-accent bg-accent/10" : "border-border bg-surface"
                }`}
              >
                <input
                  type="checkbox"
                  checked={assigned}
                  disabled={pendingId === s.id || !scheduleId}
                  onChange={() => toggleAssignment(s, assigned)}
                />
                <span className="text-sm font-medium">
                  {s.firstName} {s.lastName}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
