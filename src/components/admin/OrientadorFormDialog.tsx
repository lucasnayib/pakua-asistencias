"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import type { OrientadorListItem, StudentListItem } from "@/types";

type OrientadorFormDialogProps = {
  open: boolean;
  orientador: OrientadorListItem | null;
  onClose: () => void;
  onSaved: () => void;
};

export function OrientadorFormDialog({ open, orientador, onClose, onSaved }: OrientadorFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    if (open) {
      setFirstName(orientador?.firstName ?? "");
      setLastName(orientador?.lastName ?? "");
      setEmail(orientador?.email ?? "");
      setPhone(orientador?.phone ?? "");
      setPhoto(null);
      setPreview(orientador?.photoUrl ?? null);
      setError(null);
      setStudentSearch("");
      setSelectedIds(new Set((orientador?.students ?? []).map((s) => s.id)));

      setLoadingStudents(true);
      fetch("/api/students")
        .then((res) => res.json())
        .then((data) => setStudents(data.students ?? []))
        .finally(() => setLoadingStudents(false));
    }
  }, [open, orientador]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handlePhotoChange(file: File | null) {
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : (orientador?.photoUrl ?? null));
  }

  function toggleStudent(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("firstName", firstName);
      formData.set("lastName", lastName);
      formData.set("email", email);
      formData.set("phone", phone);
      formData.set("studentIds", JSON.stringify(Array.from(selectedIds)));
      if (photo) formData.set("photo", photo);

      const res = await fetch(orientador ? `/api/orientadores/${orientador.id}` : "/api/orientadores", {
        method: orientador ? "PATCH" : "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el orientador");
        return;
      }
      toast.success(orientador ? "Orientador actualizado" : "Orientador creado");
      onSaved();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const filteredStudents = students.filter((s) =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(92vw,34rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-6">
        <h2 className="text-lg font-semibold">{orientador ? "Editar orientador" : "Nuevo orientador"}</h2>

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
        <Input
          label="Email (opcional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input label="Teléfono (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Alumnos a cargo</span>
            <span className="text-xs text-muted-foreground">{selectedIds.size} seleccionados</span>
          </div>
          <Input
            placeholder="Buscar alumno…"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
          />
          {loadingStudents ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" /> Cargando alumnos…
            </div>
          ) : (
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-2">
              {filteredStudents.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">No hay alumnos para mostrar.</p>
              ) : (
                filteredStudents.map((s) => (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition ${
                      selectedIds.has(s.id) ? "bg-accent/10" : "hover:bg-surface-2"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleStudent(s.id)}
                    />
                    <span className="text-sm">
                      {s.firstName} {s.lastName}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

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
