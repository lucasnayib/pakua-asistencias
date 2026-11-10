"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SidebarIcon, SidebarIconName } from "./SidebarIcon";
import { ContactEmailDialog } from "./ContactEmailDialog";
import { PasswordChangeDialog } from "./PasswordChangeDialog";
import { useTour } from "./tour/TourProvider";

// Igual a la duración de modal-out en globals.css.
const CLOSE_ANIMATION_MS = 140;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

type AccountDialogProps = {
  open: boolean;
  onClose: () => void;
  displayName: string;
  username: string;
  contactEmail: string | null;
  photoUrl: string | null;
  onPhotoChanged: (photoUrl: string | null) => void;
};

function SettingsRow({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: SidebarIconName;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface-2"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/60">
        <SidebarIcon name={icon} className="h-5 w-5 text-muted-foreground" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <SidebarIcon name="chevron-right" className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export function AccountDialog({
  open,
  onClose,
  displayName,
  username,
  contactEmail: initialContactEmail,
  photoUrl,
  onPhotoChanged,
}: AccountDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { start: startTour } = useTour();

  const [contactEmail, setContactEmail] = useState(initialContactEmail);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (open) setContactEmail(initialContactEmail);
  }, [open, initialContactEmail]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.classList.remove("modal-exit");
      if (!dialog.open) dialog.showModal();
      return;
    }
    if (!dialog.open) return;
    dialog.classList.add("modal-exit");
    const timer = setTimeout(() => {
      dialog.close();
      dialog.classList.remove("modal-exit");
    }, CLOSE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  async function handlePhotoSelected(file: File) {
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("La imagen supera los 5MB permitidos.");
      return;
    }
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.set("photo", file);
      const res = await fetch("/api/admin/photo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo subir la foto");
        return;
      }
      onPhotoChanged(data.photoUrl);
      toast.success("Foto de perfil actualizada");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    setUploadingPhoto(true);
    try {
      const res = await fetch("/api/admin/photo", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo quitar la foto");
        return;
      }
      onPhotoChanged(null);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleStartTour() {
    onClose();
    startTour();
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
        className="modal-dialog m-auto w-[min(92vw,26rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-lg font-semibold">Mi cuenta</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 p-6">
          <div className="relative">
            <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-surface-2">
              {photoUrl ? (
                <Image src={photoUrl} alt={displayName} fill sizes="96px" className="object-cover" />
              ) : (
                <SidebarIcon name="user" className="h-10 w-10 text-muted-foreground" />
              )}
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              aria-label="Cambiar foto de perfil"
              title="Cambiar foto de perfil"
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-accent text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              <SidebarIcon name="camera" className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoSelected(file);
                e.target.value = "";
              }}
            />
          </div>
          {photoUrl && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={uploadingPhoto}
              className="text-xs text-muted-foreground hover:underline disabled:opacity-50"
            >
              Quitar foto
            </button>
          )}
          <div className="text-center">
            <p className="text-lg font-semibold">{displayName}</p>
            <p className="text-sm text-muted-foreground">@{username}</p>
            <p className="text-xs text-muted-foreground">{contactEmail ?? "Sin mail cargado"}</p>
          </div>
        </div>

        <div className="mx-6 mb-6 divide-y divide-border overflow-hidden rounded-2xl border border-border">
          <SettingsRow
            icon="mail"
            title="Mail de contacto"
            subtitle="Cambiar mail"
            onClick={() => setEmailDialogOpen(true)}
          />
          <SettingsRow
            icon="lock"
            title="Contraseña"
            subtitle="Cambiar tu contraseña"
            onClick={() => setPasswordDialogOpen(true)}
          />
          <SettingsRow
            icon="compass"
            title="Guía interactiva"
            subtitle="Repetir el recorrido guiado"
            onClick={handleStartTour}
          />
        </div>
      </dialog>

      <ContactEmailDialog
        open={emailDialogOpen}
        currentEmail={contactEmail}
        onClose={() => setEmailDialogOpen(false)}
        onChanged={(email) => {
          setContactEmail(email);
          router.refresh();
        }}
      />
      <PasswordChangeDialog
        open={passwordDialogOpen}
        contactEmail={contactEmail}
        onClose={() => setPasswordDialogOpen(false)}
        onChanged={() => {}}
      />
    </>
  );
}
