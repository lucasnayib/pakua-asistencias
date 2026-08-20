"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StudentFormDialog } from "@/components/admin/StudentFormDialog";
import type { StudentListItem } from "@/types";

type ConfirmAction = { type: "deactivate" | "reactivate" | "delete"; student: StudentListItem };

export default function AlumnosAdminPage() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentListItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStudents = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (showInactive) params.set("includeInactive", "1");
    fetch(`/api/students?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setStudents(data.students ?? []))
      .finally(() => setLoading(false));
  }, [search, showInactive]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(student: StudentListItem) {
    setEditing(student);
    setFormOpen(true);
  }

  async function handleSetActive(student: StudentListItem, active: boolean) {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("active", String(active));
      const res = await fetch(`/api/students/${student.id}`, { method: "PATCH", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo actualizar el alumno");
        return;
      }
      toast.success(active ? "Alumno reactivado" : "Alumno dado de baja");
      setConfirmAction(null);
      loadStudents();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(student: StudentListItem) {
    setBusy(true);
    try {
      const res = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo eliminar el alumno");
        return;
      }
      toast.success("Alumno eliminado");
      setConfirmAction(null);
      loadStudents();
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(file: File) {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/students/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo importar el archivo");
        return;
      }
      toast.success(`${data.imported} alumnos importados`);
      loadStudents();
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Alumnos</h1>
          <p className="text-sm text-muted-foreground">Altas, bajas y edición de alumnos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
          />
          <Button variant="secondary" loading={importing} onClick={() => fileInputRef.current?.click()}>
            Importar Excel
          </Button>
          <Button onClick={openCreate}>Nuevo alumno</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Buscar"
          placeholder="Nombre o apellido…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <label className="flex h-10 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Mostrar dados de baja
        </label>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Cargando…
        </div>
      ) : students.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No hay alumnos para mostrar.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => (
            <Card key={s.id} className="flex items-center gap-3 p-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2">
                {s.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {s.firstName[0]}
                    {s.lastName[0]}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {s.firstName} {s.lastName}
                </p>
                {!s.active && <p className="text-xs text-danger">Dado de baja</p>}
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <button className="text-muted-foreground hover:underline" onClick={() => openEdit(s)}>
                    Editar
                  </button>
                  {s.active ? (
                    <button
                      className="text-muted-foreground hover:underline"
                      onClick={() => setConfirmAction({ type: "deactivate", student: s })}
                    >
                      Dar de baja
                    </button>
                  ) : (
                    <button
                      className="text-muted-foreground hover:underline"
                      onClick={() => handleSetActive(s, true)}
                    >
                      Reactivar
                    </button>
                  )}
                  <button
                    className="text-danger hover:underline"
                    onClick={() => setConfirmAction({ type: "delete", student: s })}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <StudentFormDialog
        open={formOpen}
        student={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          loadStudents();
        }}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction?.type === "delete"
            ? "Eliminar alumno definitivamente"
            : confirmAction?.type === "deactivate"
              ? "Dar de baja al alumno"
              : ""
        }
        message={
          confirmAction?.type === "delete"
            ? `Esta acción borra a ${confirmAction.student.firstName} ${confirmAction.student.lastName} de forma permanente. Si tiene historial de asistencias, no se podrá eliminar: dalo de baja en su lugar.`
            : confirmAction?.type === "deactivate"
              ? `${confirmAction.student.firstName} ${confirmAction.student.lastName} dejará de aparecer en las clases activas. Podés reactivarlo cuando quieras.`
              : ""
        }
        confirmLabel={confirmAction?.type === "delete" ? "Eliminar" : "Dar de baja"}
        danger
        loading={busy}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === "delete") handleDelete(confirmAction.student);
          else handleSetActive(confirmAction.student, false);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
