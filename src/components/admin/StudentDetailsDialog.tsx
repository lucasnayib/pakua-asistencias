"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateEs } from "@/lib/time";
import type { StudentGraduationHistoryItem, StudentListItem } from "@/types";

type StudentDetailsDialogProps = {
  open: boolean;
  student: StudentListItem | null;
  onClose: () => void;
  onChanged: () => void;
};

export function StudentDetailsDialog({ open, student, onClose, onChanged }: StudentDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [history, setHistory] = useState<StudentGraduationHistoryItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<StudentGraduationHistoryItem | null>(null);
  const [formGraduacion, setFormGraduacion] = useState("");
  const [formAuthorizedAt, setFormAuthorizedAt] = useState("");
  const [formDelivered, setFormDelivered] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentGraduationHistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) {
      setHistory(student?.graduationHistory ?? []);
      setFormOpen(false);
      setEditingEntry(null);
      setFormError(null);
    }
  }, [open, student]);

  if (!student) return null;

  const isGym = student.formacion === "Gym";

  function openAddForm() {
    setEditingEntry(null);
    setFormGraduacion("");
    setFormAuthorizedAt("");
    setFormDelivered(false);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(entry: StudentGraduationHistoryItem) {
    setEditingEntry(entry);
    setFormGraduacion(entry.graduacion);
    setFormAuthorizedAt(entry.authorizedAt ?? "");
    setFormDelivered(entry.delivered);
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingEntry(null);
    setFormError(null);
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!student) return;
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        graduacion: formGraduacion,
        authorizedAt: formAuthorizedAt || null,
        delivered: formDelivered,
      };
      const res = await fetch(
        editingEntry
          ? `/api/students/${student.id}/graduation-history/${editingEntry.id}`
          : `/api/students/${student.id}/graduation-history`,
        {
          method: editingEntry ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "No se pudo guardar");
        return;
      }
      const saved: StudentGraduationHistoryItem = data.entry;
      setHistory((current) =>
        editingEntry
          ? current.map((h) => (h.id === saved.id ? saved : h))
          : [saved, ...current]
      );
      toast.success(editingEntry ? "Graduación actualizada" : "Graduación agregada al historial");
      closeForm();
      onChanged();
    } catch {
      setFormError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleDelivered(entry: StudentGraduationHistoryItem) {
    if (!student) return;
    setTogglingId(entry.id);
    try {
      const res = await fetch(`/api/students/${student.id}/graduation-history/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivered: !entry.delivered }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo actualizar");
        return;
      }
      const saved: StudentGraduationHistoryItem = data.entry;
      setHistory((current) => current.map((h) => (h.id === saved.id ? saved : h)));
      onChanged();
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!student || !deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/students/${student.id}/graduation-history/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo eliminar");
        return;
      }
      setHistory((current) => current.filter((h) => h.id !== deleteTarget.id));
      toast.success("Graduación eliminada del historial");
      setDeleteTarget(null);
      onChanged();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
        className="m-auto w-[min(90vw,28rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold">
            {student.lastName}, {student.firstName}
          </h2>

          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Formación</dt>
              <dd className="mt-0.5">{student.formacion || "—"}</dd>
            </div>
            {!isGym && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Graduación</dt>
                <dd className="mt-0.5">{student.graduacion || "—"}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isGym ? "Fecha de Ingreso" : "¿Cuándo fue Autorizado?"}
              </dt>
              <dd className="mt-0.5">
                {student.evaluationDate ? formatDateEs(student.evaluationDate) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">D.N.I.</dt>
              <dd className="mt-0.5">{student.dni ? `D.N.I. ${student.dni}` : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Orientador</dt>
              <dd className="mt-0.5">
                {student.orientador ? `${student.orientador.lastName}, ${student.orientador.firstName}` : "—"}
              </dd>
            </div>
          </dl>

          {!isGym && (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Graduaciones anteriores
                </h3>
                {!formOpen && (
                  <button type="button" className="text-xs text-accent hover:underline" onClick={openAddForm}>
                    + Agregar
                  </button>
                )}
              </div>

              {history.length === 0 && !formOpen && (
                <p className="text-sm text-muted-foreground">Sin graduaciones anteriores registradas.</p>
              )}

              {history.length > 0 && (
                <ul className="flex max-h-40 flex-col divide-y divide-border overflow-y-auto text-sm">
                  {history.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{entry.graduacion}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.authorizedAt ? formatDateEs(entry.authorizedAt) : "Sin fecha"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`text-xs ${entry.delivered ? "text-success" : "text-muted-foreground"}`}>
                          {entry.delivered ? "Entregado ✓" : "Pendiente"}
                        </span>
                        <Switch
                          checked={entry.delivered}
                          onChange={() => handleToggleDelivered(entry)}
                          disabled={togglingId === entry.id}
                        />
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:underline"
                          onClick={() => openEditForm(entry)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-xs text-danger hover:underline"
                          onClick={() => setDeleteTarget(entry)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {formOpen && (
                <form onSubmit={handleFormSubmit} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <Input
                    label="Graduación"
                    placeholder='Ej: "Cinto Naranja"'
                    value={formGraduacion}
                    onChange={(e) => setFormGraduacion(e.target.value)}
                    required
                  />
                  <Input
                    label="¿Cuándo fue Autorizado?"
                    type="date"
                    value={formAuthorizedAt}
                    onChange={(e) => setFormAuthorizedAt(e.target.value)}
                  />
                  <Switch checked={formDelivered} onChange={setFormDelivered} label="Entregado" />
                  {formError && <p className="text-xs text-danger">{formError}</p>}
                  <div className="mt-1 flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={closeForm} disabled={saving}>
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" loading={saving}>
                      Guardar
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="mt-2 flex justify-end">
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar graduación anterior"
        message={
          deleteTarget
            ? `Se eliminará "${deleteTarget.graduacion}" del historial de ${student.lastName}, ${student.firstName}.`
            : undefined
        }
        confirmLabel="Eliminar"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
