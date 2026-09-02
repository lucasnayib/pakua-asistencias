"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { slugify } from "@/lib/slug";
import type { AdminListItem } from "@/types";

type AdminFormDialogProps = {
  open: boolean;
  admin: AdminListItem | null;
  onClose: () => void;
  onSaved: () => void;
};

export function AdminFormDialog({ open, admin, onClose, onSaved }: AdminFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (open) {
      setUsername(admin?.username ?? "");
      setPassword("");
      setDisplayName(admin?.displayName ?? "");
      setSlug(admin?.slug ?? "");
      setSlugTouched(Boolean(admin));
      setError(null);
    }
  }, [open, admin]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleDisplayNameChange(value: string) {
    setDisplayName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(slugify(value));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { displayName, slug };
      if (!admin) {
        body.username = username;
        body.password = password;
      }

      const res = await fetch(admin ? `/api/admins/${admin.id}` : "/api/admins", {
        method: admin ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar la cuenta");
        return;
      }
      toast.success(admin ? "Cuenta actualizada" : "Cuenta creada");
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
      className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-6">
        <h2 className="text-lg font-semibold">{admin ? "Editar cuenta" : "Nueva cuenta de admin"}</h2>

        <Input
          label="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={Boolean(admin)}
        />
        {!admin && (
          <PasswordInput
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}
        {admin && (
          <p className="text-xs text-muted-foreground">
            La contraseña la cambia el propio admin desde &quot;¿Olvidaste tu contraseña?&quot; en el
            login — no se puede cambiar desde acá.
          </p>
        )}
        <Input
          label="Nombre a mostrar"
          value={displayName}
          onChange={(e) => handleDisplayNameChange(e.target.value)}
          required
        />
        <div className="flex flex-col gap-1">
          <Input
            label="Dirección (slug)"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            required
            minLength={3}
            maxLength={50}
            pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
          />
          <p className="truncate text-xs text-muted-foreground">
            {origin || "tudominio.com"}/escuela/{slug || "…"}
          </p>
          {admin && (
            <p className="text-xs font-medium text-danger">
              Si cambiás esto, el enlace guardado en el dispositivo de la escuela dejará de funcionar.
            </p>
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
