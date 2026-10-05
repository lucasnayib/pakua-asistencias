"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OverflowMenu } from "@/components/ui/OverflowMenu";
import { PhotoLightbox } from "@/components/ui/PhotoLightbox";
import { StudentFormDialog } from "@/components/admin/StudentFormDialog";
import { StudentDetailsDialog } from "@/components/admin/StudentDetailsDialog";
import { StudentMigrationDialog } from "@/components/admin/StudentMigrationDialog";
import { ReceiveMigratedStudentDialog } from "@/components/admin/ReceiveMigratedStudentDialog";
import { InactivityDeactivationSettings } from "@/components/admin/InactivityDeactivationSettings";
import type { StudentListItem } from "@/types";

type ConfirmAction = { type: "deactivate" | "reactivate" | "delete"; student: StudentListItem };
type StudentView = "active" | "inactive";

export default function AlumnosAdminPage() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<StudentView>("active");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentListItem | null>(null);
  const [detailsStudent, setDetailsStudent] = useState<StudentListItem | null>(null);
  const [zoomedStudent, setZoomedStudent] = useState<StudentListItem | null>(null);
  const [migratingStudent, setMigratingStudent] = useState<StudentListItem | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [orientadores, setOrientadores] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStudents = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (view === "inactive") params.set("onlyInactive", "1");
    fetch(`/api/students?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setStudents(data.students ?? []);
        setInactiveCount(data.inactiveCount ?? 0);
      })
      .finally(() => setLoading(false));
  }, [search, view]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    fetch("/api/orientadores?includeInactive=1")
      .then((res) => res.json())
      .then((data) => setOrientadores(data.orientadores ?? []));
  }, []);

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

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/students/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo exportar la lista de alumnos");
        return;
      }
      const blob = await res.blob();
      const filename =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "alumnos.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Lista de alumnos exportada");
    } catch {
      toast.error("Error de conexión al exportar");
    } finally {
      setExporting(false);
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
          <Button variant="secondary" loading={exporting} onClick={handleExport}>
            Exportar alumnos
          </Button>
          <Button variant="secondary" onClick={() => setReceiveOpen(true)}>
            Recibir alumno migrado
          </Button>
          <Button onClick={openCreate}>Nuevo alumno</Button>
        </div>
      </div>

      <details className="group rounded-xl border border-border">
        <summary className="cursor-pointer select-none list-none p-4 text-sm font-medium text-muted-foreground hover:text-foreground">
          Configuración: baja automática por inactividad
        </summary>
        <div className="border-t border-border p-4">
          <InactivityDeactivationSettings />
        </div>
      </details>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Buscar"
          placeholder="Nombre o apellido…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <div className="flex h-10 gap-1 rounded-lg border border-border p-1">
          <button
            type="button"
            onClick={() => setView("active")}
            className={`rounded-md px-3 text-sm font-medium transition ${
              view === "active" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-surface-2"
            }`}
          >
            Activos
          </button>
          <button
            type="button"
            onClick={() => setView("inactive")}
            className={`rounded-md px-3 text-sm font-medium transition ${
              view === "inactive" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-surface-2"
            }`}
          >
            Dados de baja ({inactiveCount})
          </button>
        </div>
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
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2">
                {s.photoUrl ? (
                  <button
                    type="button"
                    onClick={() => setZoomedStudent(s)}
                    className="h-full w-full cursor-zoom-in"
                    aria-label={`Ver foto de ${s.firstName} ${s.lastName} en grande`}
                  >
                    <Image src={s.photoUrl} alt={`${s.firstName} ${s.lastName}`} fill sizes="56px" className="object-cover" />
                  </button>
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
              </div>
              <OverflowMenu
                items={[
                  { label: "Más información", onSelect: () => setDetailsStudent(s) },
                  { label: "Editar", onSelect: () => openEdit(s) },
                  ...(s.active
                    ? [
                        { label: "Dar de baja", onSelect: () => setConfirmAction({ type: "deactivate", student: s }) },
                        { label: "Migrar a otra escuela", onSelect: () => setMigratingStudent(s) },
                      ]
                    : [{ label: "Reactivar", onSelect: () => handleSetActive(s, true) }]),
                  { label: "Eliminar", onSelect: () => setConfirmAction({ type: "delete", student: s }), danger: true },
                ]}
              />
            </Card>
          ))}
        </div>
      )}

      <StudentFormDialog
        open={formOpen}
        student={editing}
        orientadores={orientadores}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          loadStudents();
        }}
      />

      <StudentDetailsDialog
        open={detailsStudent !== null}
        student={detailsStudent}
        onClose={() => setDetailsStudent(null)}
        onChanged={loadStudents}
      />

      <PhotoLightbox
        open={zoomedStudent !== null}
        photoUrl={zoomedStudent?.photoUrl ?? null}
        alt={zoomedStudent ? `${zoomedStudent.firstName} ${zoomedStudent.lastName}` : ""}
        onClose={() => setZoomedStudent(null)}
      />

      <StudentMigrationDialog
        open={migratingStudent !== null}
        student={migratingStudent}
        onClose={() => setMigratingStudent(null)}
      />

      <ReceiveMigratedStudentDialog
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        onMigrated={loadStudents}
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
