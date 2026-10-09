"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Switch } from "@/components/ui/Switch";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MediaGrid } from "@/components/encuentro/MediaGrid";
import { MediaLightbox } from "@/components/encuentro/MediaLightbox";
import type { EncuentroMediaMeta } from "@/lib/encuentro-storage";

type GalleryState = { galleryEnabled: boolean; galleryUrl: string | null };
type ApprovedSummary = { count: number; usedBytes: number; freeBytes: number | null };

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function toggleInSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function isAllSelected(items: EncuentroMediaMeta[], selected: Set<string>): boolean {
  return items.length > 0 && selected.size === items.length;
}

const pendingThumbUrl = (id: string) => `/api/admin/encuentro/media/pendientes/${id}/thumb`;
const pendingFullUrl = (id: string) => `/api/admin/encuentro/media/pendientes/${id}/full`;
const approvedThumbUrl = (id: string) => `/api/admin/encuentro/media/aprobados/${id}/thumb`;
const approvedFullUrl = (id: string) => `/api/admin/encuentro/media/aprobados/${id}/full`;

export function EncuentroAdminClient() {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<EncuentroMediaMeta[]>([]);
  const [approved, setApproved] = useState<EncuentroMediaMeta[]>([]);
  const [summary, setSummary] = useState<ApprovedSummary>({ count: 0, usedBytes: 0, freeBytes: null });
  const [gallery, setGallery] = useState<GalleryState>({ galleryEnabled: false, galleryUrl: null });
  const [qr, setQr] = useState<{ dataUrl: string; url: string } | null>(null);

  const [pendingSelected, setPendingSelected] = useState<Set<string>>(new Set());
  const [approvedSelected, setApprovedSelected] = useState<Set<string>>(new Set());
  const [pendingLightbox, setPendingLightbox] = useState<number | null>(null);
  const [approvedLightbox, setApprovedLightbox] = useState<number | null>(null);

  const [approvedOpen, setApprovedOpen] = useState(false);

  const [rejectConfirm, setRejectConfirm] = useState(false);
  const [unapproveConfirm, setUnapproveConfirm] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, approvedRes, galleryRes] = await Promise.all([
        fetch("/api/admin/encuentro/pendientes").then((r) => r.json()),
        fetch("/api/admin/encuentro/aprobados").then((r) => r.json()),
        fetch("/api/admin/encuentro/galeria").then((r) => r.json()),
      ]);
      setPending(pendingRes.items ?? []);
      setApproved(approvedRes.items ?? []);
      setSummary({
        count: approvedRes.count ?? 0,
        usedBytes: approvedRes.usedBytes ?? 0,
        freeBytes: approvedRes.freeBytes ?? null,
      });
      setGallery({ galleryEnabled: galleryRes.galleryEnabled ?? false, galleryUrl: galleryRes.galleryUrl ?? null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    fetch("/api/admin/encuentro/qr")
      .then((r) => (r.ok ? r.json() : null))
      .then(setQr)
      .catch(() => setQr(null));
  }, [loadAll]);

  async function approve(body: { all?: boolean; ids?: string[] }) {
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/encuentro/pendientes/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo aprobar");
        return;
      }
      toast.success(`${data.approved} aprobado(s)`);
      setPendingSelected(new Set());
      await loadAll();
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmReject() {
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/encuentro/pendientes/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(pendingSelected) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo rechazar");
        return;
      }
      toast.success(`${data.rejected} rechazado(s)`);
      setPendingSelected(new Set());
      setRejectConfirm(false);
      await loadAll();
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmUnapprove() {
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/encuentro/aprobados/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(approvedSelected) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo eliminar");
        return;
      }
      toast.success(`${data.removed} eliminado(s) de la galería`);
      setApprovedSelected(new Set());
      setUnapproveConfirm(false);
      await loadAll();
    } finally {
      setActionBusy(false);
    }
  }

  async function toggleGallery(enabled: boolean) {
    setGalleryBusy(true);
    try {
      const res = await fetch("/api/admin/encuentro/galeria/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo actualizar");
        return;
      }
      const refreshed = await fetch("/api/admin/encuentro/galeria").then((r) => r.json());
      setGallery({ galleryEnabled: refreshed.galleryEnabled, galleryUrl: refreshed.galleryUrl });
    } finally {
      setGalleryBusy(false);
    }
  }

  async function regenerateToken() {
    setGalleryBusy(true);
    try {
      const res = await fetch("/api/admin/encuentro/galeria/regenerate", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "No se pudo regenerar el link");
        return;
      }
      setGallery({ galleryEnabled: data.galleryEnabled, galleryUrl: data.galleryUrl });
      toast.success("Link regenerado");
    } finally {
      setGalleryBusy(false);
    }
  }

  function copyLink() {
    if (!gallery.galleryUrl) return;
    navigator.clipboard
      .writeText(gallery.galleryUrl)
      .then(() => toast.success("Link copiado"))
      .catch(() => toast.error("No se pudo copiar"));
  }

  function shareLink() {
    if (!gallery.galleryUrl) return;
    if (typeof navigator.share === "function") {
      navigator.share({ title: "Galería del Encuentro", url: gallery.galleryUrl }).catch(() => {});
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner className="h-4 w-4" /> Cargando…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Pendientes de revisión ({pending.length})</h2>
          {pending.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setPendingSelected(isAllSelected(pending, pendingSelected) ? new Set() : new Set(pending.map((i) => i.id)))
                }
              >
                {isAllSelected(pending, pendingSelected) ? "Deseleccionar todo" : "Seleccionar todo"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pendingSelected.size === 0}
                loading={actionBusy}
                onClick={() => approve({ ids: Array.from(pendingSelected) })}
              >
                Aprobar seleccionados ({pendingSelected.size})
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={pendingSelected.size === 0}
                onClick={() => setRejectConfirm(true)}
              >
                Rechazar seleccionados
              </Button>
            </div>
          )}
        </div>
        <MediaGrid
          items={pending}
          thumbUrl={pendingThumbUrl}
          fullUrl={pendingFullUrl}
          selectable
          selectedIds={pendingSelected}
          onToggleSelect={(id) => setPendingSelected((current) => toggleInSet(current, id))}
          onOpenIndex={setPendingLightbox}
        />
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setApprovedOpen((current) => !current)}
            aria-expanded={approvedOpen}
            aria-controls="encuentro-approved-grid"
            className="flex items-center gap-2 text-left"
          >
            <svg
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                approvedOpen ? "rotate-180" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <div>
              <h2 className="text-lg font-semibold">Aprobados ({summary.count})</h2>
              <p className="text-xs text-muted-foreground">
                {formatBytes(summary.usedBytes)} usados · {formatBytes(summary.freeBytes)} libres en el servidor
              </p>
            </div>
          </button>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/admin/encuentro/aprobados/zip"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-surface-2 px-3 text-sm font-medium text-foreground transition hover:bg-surface"
            >
              Descargar ZIP
            </a>
            <Button
              size="sm"
              variant="secondary"
              disabled={approved.length === 0}
              onClick={() =>
                setApprovedSelected(isAllSelected(approved, approvedSelected) ? new Set() : new Set(approved.map((i) => i.id)))
              }
            >
              {isAllSelected(approved, approvedSelected) ? "Deseleccionar todo" : "Seleccionar todo"}
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={approvedSelected.size === 0}
              onClick={() => setUnapproveConfirm(true)}
            >
              Eliminar seleccionados ({approvedSelected.size})
            </Button>
          </div>
        </div>
        {approvedOpen && (
          <div id="encuentro-approved-grid">
            <MediaGrid
              items={approved}
              thumbUrl={approvedThumbUrl}
              fullUrl={approvedFullUrl}
              selectable
              selectedIds={approvedSelected}
              onToggleSelect={(id) => setApprovedSelected((current) => toggleInSet(current, id))}
              onOpenIndex={setApprovedLightbox}
            />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">Galería pública</h2>
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="font-medium">{gallery.galleryEnabled ? "Activa" : "Desactivada"}</p>
            <p className="max-w-md truncate text-sm text-muted-foreground">
              {gallery.galleryUrl ?? "Todavía no generaste un link."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Switch checked={gallery.galleryEnabled} onChange={toggleGallery} disabled={galleryBusy} label="Activar" />
            <Button size="sm" variant="secondary" loading={galleryBusy} onClick={regenerateToken}>
              Regenerar link
            </Button>
            <Button size="sm" variant="secondary" disabled={!gallery.galleryUrl} onClick={copyLink}>
              Copiar link
            </Button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <Button size="sm" variant="secondary" disabled={!gallery.galleryUrl} onClick={shareLink}>
                Compartir
              </Button>
            )}
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-6 print:border-0 print:pt-0">
        <h2 className="text-lg font-semibold print:hidden">QR para imprimir</h2>
        {qr ? (
          <Card className="flex flex-col items-center gap-3 p-6 print:border-0 print:shadow-none">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL generado en el servidor */}
            <img src={qr.dataUrl} alt="Código QR del Encuentro" className="h-56 w-56" />
            <p className="max-w-full break-all text-center text-xs text-muted-foreground">{qr.url}</p>
            <Button size="sm" variant="secondary" className="print:hidden" onClick={() => window.print()}>
              Imprimir
            </Button>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            Configurá EVENT_UPLOAD_CODE en el servidor para generar el código QR.
          </p>
        )}
      </section>

      <MediaLightbox
        items={pending}
        index={pendingLightbox}
        fullUrl={pendingFullUrl}
        onClose={() => setPendingLightbox(null)}
        onNavigate={setPendingLightbox}
      />
      <MediaLightbox
        items={approved}
        index={approvedLightbox}
        fullUrl={approvedFullUrl}
        onClose={() => setApprovedLightbox(null)}
        onNavigate={setApprovedLightbox}
      />

      <ConfirmDialog
        open={rejectConfirm}
        title="Rechazar archivos"
        message={`Se van a borrar ${pendingSelected.size} archivo(s) seleccionados para siempre. No se puede deshacer.`}
        confirmLabel="Rechazar"
        danger
        loading={actionBusy}
        onConfirm={confirmReject}
        onCancel={() => setRejectConfirm(false)}
      />
      <ConfirmDialog
        open={unapproveConfirm}
        title="Sacar de la galería"
        message={`Esto va a sacar ${approvedSelected.size} archivo(s) de la galería para siempre. La gente que ya los vio no pierde una copia que haya guardado, pero dejan de estar disponibles acá.`}
        confirmLabel="Eliminar"
        danger
        loading={actionBusy}
        onConfirm={confirmUnapprove}
        onCancel={() => setUnapproveConfirm(false)}
      />
    </div>
  );
}
