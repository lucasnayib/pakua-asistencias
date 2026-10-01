"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatDateEs } from "@/lib/time";
import type { StudentListItem } from "@/types";

type StudentMigrationDialogProps = {
  open: boolean;
  student: StudentListItem | null;
  onClose: () => void;
};

export function StudentMigrationDialog({ open, student, onClose }: StudentMigrationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open || !student) return;
    setGeneratedCode(null);
    setError(null);
    setLoading(true);
    fetch(`/api/students/${student.id}/migration`)
      .then((res) => res.json())
      .then((data) => {
        setPending(!!data.pending);
        setExpiresAt(data.expiresAt ?? null);
      })
      .finally(() => setLoading(false));
  }, [open, student]);

  async function handleGenerate() {
    if (!student) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${student.id}/migration`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo generar el código");
        return;
      }
      setGeneratedCode(data.code);
      setPending(true);
      setExpiresAt(data.expiresAt);
    } catch {
      setError("Error de conexión");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCancel() {
    if (!student) return;
    setCanceling(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${student.id}/migration`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo cancelar la migración");
        return;
      }
      toast.success("Migración cancelada");
      setPending(false);
      setExpiresAt(null);
      setGeneratedCode(null);
    } finally {
      setCanceling(false);
    }
  }

  async function handleCopyCode() {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      toast.success("Código copiado");
    } catch {
      toast.error("No se pudo copiar el código");
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(90vw,26rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold">
          Migrar a otra escuela — {student?.firstName} {student?.lastName}
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" /> Cargando…
          </div>
        ) : generatedCode ? (
          <>
            <p className="text-sm text-muted-foreground">
              Compartí este código con el alumno o con la escuela nueva. Se muestra una sola
              vez — si lo perdés, vas a tener que cancelar y generar uno nuevo.
            </p>
            <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-surface-2 p-4">
              <span className="font-mono text-3xl font-semibold tracking-widest">{generatedCode}</span>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Vence el {expiresAt ? formatDateEs(expiresAt.slice(0, 10)) : "—"}
            </p>
            <Button type="button" variant="secondary" onClick={handleCopyCode}>
              Copiar código
            </Button>
          </>
        ) : pending ? (
          <>
            <p className="text-sm text-muted-foreground">
              Ya hay un código de migración pendiente para este alumno, vence el{" "}
              {expiresAt ? formatDateEs(expiresAt.slice(0, 10)) : "—"}. El alumno sigue activo
              en tu escuela hasta que se use.
            </p>
            <Button type="button" variant="danger" loading={canceling} onClick={handleCancel}>
              Cancelar migración
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Se va a generar un código de un solo uso, válido por 7 días. El alumno se puede
              llevar ese código a cualquier otra escuela de la plataforma para migrarse — su
              graduación actual y el historial de graduaciones viajan con él. Recién cuando se
              use el código, este alumno queda dado de baja acá.
            </p>
            <Button type="button" loading={generating} onClick={handleGenerate}>
              Generar código de migración
            </Button>
          </>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="mt-1 flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </dialog>
  );
}
