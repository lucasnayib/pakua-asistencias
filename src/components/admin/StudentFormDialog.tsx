"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FORMACION_OPTIONS } from "@/lib/validations";
import type { StudentListItem } from "@/types";

type OrientadorOption = { id: string; firstName: string; lastName: string };

type StudentFormDialogProps = {
  open: boolean;
  student: StudentListItem | null;
  orientadores: OrientadorOption[];
  onClose: () => void;
  onSaved: () => void;
};

export function StudentFormDialog({ open, student, orientadores, onClose, onSaved }: StudentFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [formacion, setFormacion] = useState("");
  const [graduacion, setGraduacion] = useState("");
  const [evaluationDate, setEvaluationDate] = useState("");
  const [dni, setDni] = useState("");
  const [orientadorId, setOrientadorId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFirstName(student?.firstName ?? "");
      setLastName(student?.lastName ?? "");
      setFormacion(student?.formacion ?? "");
      setGraduacion(student?.graduacion ?? "");
      setEvaluationDate(student?.evaluationDate ?? "");
      setDni(student?.dni ?? "");
      setOrientadorId(student?.orientador?.id ?? "");
      setPhoto(null);
      setPreview(student?.photoUrl ?? null);
      setError(null);
    }
  }, [open, student]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const isGym = formacion === "Gym";

  function handleFormacionChange(value: string) {
    setFormacion(value);
    if (value === "Gym") setGraduacion("");
  }

  function handleDniChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    setDni(digits.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
  }

  function handlePhotoChange(file: File | null) {
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : (student?.photoUrl ?? null));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("firstName", firstName);
      formData.set("lastName", lastName);
      formData.set("formacion", formacion);
      formData.set("graduacion", graduacion);
      formData.set("evaluationDate", evaluationDate);
      formData.set("dni", dni);
      formData.set("orientadorId", orientadorId);
      if (photo) formData.set("photo", photo);

      const res = await fetch(student ? `/api/students/${student.id}` : "/api/students", {
        method: student ? "PATCH" : "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el alumno");
        return;
      }
      toast.success(student ? "Alumno actualizado" : "Alumno creado");
      onSaved();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        <h2 className="text-lg font-semibold">{student ? "Editar alumno" : "Nuevo alumno"}</h2>

        <div className="flex items-center gap-4">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground">Sin foto</span>
            )}
          </span>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Fotografía</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
              className="text-xs"
            />
          </label>
        </div>

        <Input label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <Input label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        <Select label="Formación" value={formacion} onChange={(e) => handleFormacionChange(e.target.value)}>
          <option value="">Sin especificar</option>
          {FORMACION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
        {!isGym && (
          <Input
            label="Graduación"
            placeholder='Ej: "Cinto Naranja"'
            value={graduacion}
            onChange={(e) => setGraduacion(e.target.value)}
          />
        )}
        <Input
          label={isGym ? "Fecha de Ingreso" : "¿Cuándo fue Autorizado?"}
          type="date"
          value={evaluationDate}
          onChange={(e) => setEvaluationDate(e.target.value)}
        />
        <Input
          label="D.N.I."
          placeholder="42.358.937"
          value={dni}
          onChange={(e) => handleDniChange(e.target.value)}
        />
        <Select label="Orientador" value={orientadorId} onChange={(e) => setOrientadorId(e.target.value)}>
          <option value="">Sin orientador asignado</option>
          {orientadores.map((o) => (
            <option key={o.id} value={o.id}>
              {o.lastName}, {o.firstName}
            </option>
          ))}
        </Select>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </div>
      </form>
    </dialog>
  );
}
