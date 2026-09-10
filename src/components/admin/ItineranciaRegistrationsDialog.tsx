"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { ItineranciaActivityListItem, ItineranciaPerson } from "@/types";

type ItineranciaRegistrationsDialogProps = {
  open: boolean;
  activity: ItineranciaActivityListItem | null;
  onClose: () => void;
  onChanged: () => void;
};

export function ItineranciaRegistrationsDialog({
  open,
  activity,
  onClose,
  onChanged,
}: ItineranciaRegistrationsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<ItineranciaPerson[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open || !activity) return;
    setLoading(true);
    fetch(`/api/itinerancias/activities/${activity.id}/registrations`)
      .then((res) => res.json())
      .then((data) => setStudents(data.students ?? []))
      .finally(() => setLoading(false));
  }, [open, activity]);

  async function handleRemove(student: ItineranciaPerson) {
    if (!activity) return;
    setRemovingId(student.id);
    try {
      const res = await fetch(`/api/itinerancias/activities/${activity.id}/registrations`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo quitar la inscripción");
        return;
      }
      setStudents((current) => current.filter((s) => s.id !== student.id));
      toast.success(`${student.firstName} ${student.lastName} — inscripción quitada`);
      onChanged();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(90vw,32rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold">Inscriptos — {activity?.title}</h2>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" /> Cargando…
          </div>
        ) : students.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nadie anotado todavía.</p>
        ) : (
          <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
            {students.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {s.firstName} {s.lastName}
                </span>
                <button
                  className="text-xs text-danger hover:underline disabled:opacity-50"
                  disabled={removingId === s.id}
                  onClick={() => handleRemove(s)}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </dialog>
  );
}
