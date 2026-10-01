"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDateEs } from "@/lib/time";
import type { StudentMigrationPreview } from "@/types";

type ReceiveMigratedStudentDialogProps = {
  open: boolean;
  onClose: () => void;
  onMigrated: () => void;
};

export function ReceiveMigratedStudentDialog({ open, onClose, onMigrated }: ReceiveMigratedStudentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<StudentMigrationPreview | null>(null);
  const [looking, setLooking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) {
      setCode("");
      setPreview(null);
      setError(null);
    }
  }, [open]);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    setLooking(true);
    setError(null);
    try {
      const res = await fetch("/api/students/migrate/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo validar el código");
        return;
      }
      setPreview(data);
    } catch {
      setError("Error de conexión");
    } finally {
      setLooking(false);
    }
  }

  async function handleClaim() {
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch("/api/students/migrate/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo completar la migración");
        // El código puede haber vencido o ya haber sido usado por otra escuela mientras
        // tanto: se vuelve al paso de ingresar el código en vez de insistir con este preview.
        setPreview(null);
        return;
      }
      toast.success(`${data.student.firstName} ${data.student.lastName} migrado correctamente`);
      onMigrated();
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setClaiming(false);
    }
  }

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
        <h2 className="text-lg font-semibold">Recibir alumno migrado</h2>

        {!preview ? (
          <form onSubmit={handleLookup} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Ingresá el código de 6 dígitos que te dio el alumno o su escuela anterior.
            </p>
            <Input
              label="Código"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              inputMode="numeric"
              required
              autoFocus
            />
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="mt-1 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={looking}>
                Cancelar
              </Button>
              <Button type="submit" loading={looking}>
                Buscar
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2">
                {preview.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {preview.firstName[0]}
                    {preview.lastName[0]}
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {preview.firstName} {preview.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Viene de: {preview.sourceSchoolName}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Formación</dt>
              <dd>{preview.formacion ?? "—"}</dd>
              <dt className="text-muted-foreground">Graduación actual</dt>
              <dd>
                {preview.graduacion ?? "—"}
                {preview.graduacion && (preview.graduacionDelivered ? " (Entregado)" : " (Pendiente)")}
              </dd>
              <dt className="text-muted-foreground">DNI</dt>
              <dd>{preview.dni ?? "—"}</dd>
              <dt className="text-muted-foreground">Fecha de nacimiento</dt>
              <dd>{preview.birthDate ? formatDateEs(preview.birthDate) : "—"}</dd>
              <dt className="text-muted-foreground">Historial de graduaciones</dt>
              <dd>{preview.graduationHistory.length} registradas</dd>
            </dl>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="mt-1 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPreview(null)}
                disabled={claiming}
              >
                Volver
              </Button>
              <Button type="button" loading={claiming} onClick={handleClaim}>
                Confirmar migración
              </Button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
