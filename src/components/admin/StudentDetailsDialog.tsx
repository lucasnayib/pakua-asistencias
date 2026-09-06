"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { formatDateEs } from "@/lib/time";
import type { StudentListItem } from "@/types";

type StudentDetailsDialogProps = {
  open: boolean;
  student: StudentListItem | null;
  onClose: () => void;
};

export function StudentDetailsDialog({ open, student, onClose }: StudentDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!student) return null;

  return (
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
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Graduación</dt>
            <dd className="mt-0.5">{student.graduacion || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              ¿Cuándo fue Autorizado?
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

        <div className="mt-2 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </dialog>
  );
}
