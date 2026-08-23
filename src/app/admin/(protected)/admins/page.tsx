"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AdminFormDialog } from "@/components/admin/AdminFormDialog";
import type { AdminListItem } from "@/types";

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminListItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminListItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [rejecting, setRejecting] = useState<AdminListItem | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  async function copyLink(slug: string) {
    const url = `${origin || window.location.origin}/escuela/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }

  const loadAdmins = useCallback(() => {
    setLoading(true);
    fetch("/api/admins")
      .then((res) => res.json())
      .then((data) => setAdmins(data.admins ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  async function toggleActive(admin: AdminListItem) {
    setBusyId(admin.id);
    try {
      const res = await fetch(`/api/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !admin.active }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo actualizar la cuenta");
        return;
      }
      toast.success(admin.active ? "Cuenta desactivada" : "Cuenta reactivada");
      loadAdmins();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/admins/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo eliminar la cuenta");
        return;
      }
      toast.success("Cuenta eliminada");
      setDeleting(null);
      loadAdmins();
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleApprove(admin: AdminListItem) {
    setBusyId(admin.id);
    try {
      const res = await fetch(`/api/admins/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo aprobar la cuenta");
        return;
      }
      toast.success("Solicitud aprobada");
      loadAdmins();
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject() {
    if (!rejecting) return;
    setRejectBusy(true);
    try {
      const res = await fetch(`/api/admins/${rejecting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo rechazar la solicitud");
        return;
      }
      toast.success("Solicitud rechazada");
      setRejecting(null);
      loadAdmins();
    } finally {
      setRejectBusy(false);
    }
  }

  const pending = admins.filter((a) => !a.approved);
  const approvedAdmins = admins.filter((a) => a.approved);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Administradores</h1>
          <p className="text-sm text-muted-foreground">Cuentas de admin, una por escuela</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Nuevo admin
        </Button>
      </div>

      {!loading && pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Solicitudes pendientes</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((a) => (
              <Card key={a.id} className="flex flex-col gap-3 border-accent/40 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">@{a.username}</p>
                  {a.contactEmail && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{a.contactEmail}</p>
                  )}
                  {a.contactPhone && (
                    <p className="truncate text-xs text-muted-foreground">{a.contactPhone}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    <button
                      className="font-medium text-success hover:underline"
                      disabled={busyId === a.id}
                      onClick={() => handleApprove(a)}
                    >
                      Aprobar
                    </button>
                    <button
                      className="font-medium text-danger hover:underline"
                      disabled={busyId === a.id}
                      onClick={() => setRejecting(a)}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Cargando…
        </div>
      ) : approvedAdmins.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Todavía no hay cuentas de admin.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {approvedAdmins.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{a.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">@{a.username}</p>
                {a.role === "ADMIN" && (
                  <div className="mt-1 flex items-center gap-2">
                    <p className="truncate text-xs text-accent">/escuela/{a.slug}</p>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:underline"
                      onClick={() => copyLink(a.slug)}
                    >
                      Copiar enlace
                    </button>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 font-medium">
                    {a.role === "SUPER_ADMIN" ? "Super-admin" : "Admin"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      a.active ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                    }`}
                  >
                    {a.active ? "Activo" : "Desactivado"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <button
                    className="text-muted-foreground hover:underline"
                    onClick={() => {
                      setEditing(a);
                      setFormOpen(true);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className={a.active ? "text-danger hover:underline" : "text-accent hover:underline"}
                    disabled={busyId === a.id}
                    onClick={() => toggleActive(a)}
                  >
                    {a.active ? "Desactivar" : "Reactivar"}
                  </button>
                  <button
                    className="text-danger hover:underline"
                    disabled={busyId === a.id}
                    onClick={() => setDeleting(a)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AdminFormDialog
        open={formOpen}
        admin={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          loadAdmins();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Eliminar cuenta de admin"
        message={
          deleting
            ? `Se eliminará la cuenta "${deleting.displayName}" (@${deleting.username}). Esto solo funciona si la cuenta no tiene datos asociados (alumnos, horarios, orientadores, exportaciones).`
            : ""
        }
        confirmLabel="Eliminar"
        danger
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={rejecting !== null}
        title="Rechazar solicitud"
        message={
          rejecting
            ? `Se eliminará por completo la solicitud de "${rejecting.displayName}" (@${rejecting.username}). No queda historial de esta cuenta.`
            : ""
        }
        confirmLabel="Rechazar"
        danger
        loading={rejectBusy}
        onConfirm={handleReject}
        onCancel={() => setRejecting(null)}
      />
    </div>
  );
}
