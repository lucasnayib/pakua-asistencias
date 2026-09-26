"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ItineranciaActivityFormDialog } from "@/components/admin/ItineranciaActivityFormDialog";
import { ItineranciaRegistrationsDialog } from "@/components/admin/ItineranciaRegistrationsDialog";
import type { ItineranciaActivityListItem } from "@/types";

/**
 * Agrupa los 3 diálogos que tanto el panel principal de Itinerancias como "Itinerancias
 * anteriores" necesitan (editar, ver inscriptos, eliminar), para no duplicar ese estado y ese
 * JSX en las dos pantallas. `onChanged` es el `loadActivities` de quien llama.
 */
export function useItineranciaActivityDialogs(onChanged: () => void) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ItineranciaActivityListItem | null>(null);
  const [registrationsFor, setRegistrationsFor] = useState<ItineranciaActivityListItem | null>(null);
  const [deleting, setDeleting] = useState<ItineranciaActivityListItem | null>(null);
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(activity: ItineranciaActivityListItem) {
    setEditing(activity);
    setFormOpen(true);
  }

  function openRegistrations(activity: ItineranciaActivityListItem) {
    setRegistrationsFor(activity);
  }

  function openDelete(activity: ItineranciaActivityListItem) {
    setDeleting(activity);
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/itinerancias/activities/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo eliminar la actividad");
        return;
      }
      toast.success("Actividad eliminada");
      setDeleting(null);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const dialogs = (
    <>
      <ItineranciaActivityFormDialog
        open={formOpen}
        activity={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          onChanged();
        }}
      />

      <ItineranciaRegistrationsDialog
        open={registrationsFor !== null}
        activity={registrationsFor}
        onClose={() => setRegistrationsFor(null)}
        onChanged={onChanged}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar actividad"
        message={
          deleting
            ? `Esta acción borra "${deleting.title}" y todas sus inscripciones de forma permanente.`
            : ""
        }
        confirmLabel="Eliminar"
        danger
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );

  return { dialogs, openCreate, openEdit, openRegistrations, openDelete };
}
