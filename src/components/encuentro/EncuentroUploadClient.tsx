"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EncuentroHeader } from "./EncuentroHeader";
import { EncuentroPrivacyNotice } from "./EncuentroPrivacyNotice";

const ACCEPTED_TYPES =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,video/mp4,video/quicktime,video/webm,video/3gpp,video/x-m4v";

const MAX_RETRIES = 6;
const RETRY_BASE_MS = 1000;
const CONCURRENT_FILES = 2;

type UploadStatus = "queued" | "uploading" | "retry-needed" | "failed" | "done";

type UploadItem = {
  localId: string;
  file: File;
  status: UploadStatus;
  sessionId: string | null;
  totalChunks: number;
  uploadedChunks: number;
  error: string | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadChunkWithRetry(sessionId: string, index: number, blob: Blob): Promise<void> {
  const buffer = await blob.arrayBuffer();
  const hash = await sha256Hex(buffer);

  let lastError = "No se pudo subir";
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`/api/encuentro/upload/${sessionId}/chunk/${index}`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream", "X-Chunk-Sha256": hash },
        body: buffer,
      });
      if (res.ok) return;
      const data = await res.json().catch(() => null);
      lastError = data?.error ?? `Error ${res.status}`;
      // 422 (hash no coincide) y 400 (índice inválido) no mejoran con un reintento idéntico.
      if (res.status === 422 || res.status === 400) break;
    } catch {
      lastError = "Error de conexión";
    }
    await sleep(RETRY_BASE_MS * 2 ** attempt);
  }
  throw new Error(lastError);
}

export function EncuentroUploadClient() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [allDone, setAllDone] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateItem(localId: string, patch: Partial<UploadItem>) {
    setItems((current) => current.map((item) => (item.localId === localId ? { ...item, ...patch } : item)));
  }

  async function uploadOne(item: UploadItem, resumeFromChunk = 0, existingSessionId: string | null = null) {
    updateItem(item.localId, { status: "uploading", error: null });

    let sessionId = existingSessionId;
    let totalChunks = item.totalChunks;
    const startChunk = resumeFromChunk;

    try {
      if (!sessionId) {
        const res = await fetch("/api/encuentro/upload/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mime: item.file.type, size: item.file.size }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "No se pudo iniciar la subida");
        sessionId = data.sessionId;
        totalChunks = data.totalChunks;
        updateItem(item.localId, { sessionId, totalChunks, uploadedChunks: 0 });
      }

      const chunkSize = Math.ceil(item.file.size / totalChunks);
      for (let i = startChunk; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, item.file.size);
        await uploadChunkWithRetry(sessionId!, i, item.file.slice(start, end));
        updateItem(item.localId, { uploadedChunks: i + 1 });
      }

      updateItem(item.localId, { status: "done" });
    } catch (error) {
      updateItem(item.localId, {
        status: "retry-needed",
        error: error instanceof Error ? error.message : "No se pudo subir",
      });
    }
  }

  async function retryItem(item: UploadItem) {
    if (!item.sessionId) {
      await uploadOne(item);
      return;
    }
    // Pregunta al servidor qué partes ya tiene, en vez de reenviar todo desde cero.
    try {
      const res = await fetch(`/api/encuentro/upload/${item.sessionId}/status`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        await uploadOne(item);
        return;
      }
      if (data.complete) {
        updateItem(item.localId, { status: "done", uploadedChunks: item.totalChunks });
        return;
      }
      const existing: number[] = data.existingChunks ?? [];
      const nextMissing = Array.from({ length: item.totalChunks }, (_, i) => i).find((i) => !existing.includes(i));
      updateItem(item.localId, { uploadedChunks: existing.length });
      await uploadOne({ ...item, totalChunks: item.totalChunks }, nextMissing ?? item.totalChunks, item.sessionId);
    } catch {
      await uploadOne(item);
    }
  }

  async function runQueue(queue: UploadItem[]) {
    let cursor = 0;
    async function worker() {
      while (cursor < queue.length) {
        const item = queue[cursor];
        cursor += 1;
        await uploadOne(item);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENT_FILES, queue.length) }, worker));
    setAllDone(true);
  }

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const newItems: UploadItem[] = Array.from(fileList).map((file, index) => ({
      localId: `${Date.now()}-${index}-${file.name}`,
      file,
      status: "queued",
      sessionId: null,
      totalChunks: 0,
      uploadedChunks: 0,
      error: null,
    }));
    setAllDone(false);
    setItems((current) => [...current, ...newItems]);
    runQueue(newItems);
  }

  const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);
  const uploadedBytes = items.reduce((sum, item) => {
    const chunkSize = item.totalChunks > 0 ? Math.ceil(item.file.size / item.totalChunks) : 0;
    return sum + Math.min(item.uploadedChunks * chunkSize, item.file.size);
  }, 0);
  const overallPercent = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;
  const doneCount = items.filter((item) => item.status === "done").length;
  const failedCount = items.filter((item) => item.status === "retry-needed" || item.status === "failed").length;
  const showSuccess = allDone && items.length > 0 && doneCount === items.length;

  return (
    <div className="flex min-h-dvh flex-col">
      <EncuentroHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold">Subí tus fotos y videos</h1>
          <p className="text-sm text-muted-foreground">
            Elegí todas las fotos y videos que quieras del encuentro. Se suben en el fondo,
            podés seguir usando el celular mientras tanto.
          </p>
        </div>

        <EncuentroPrivacyNotice />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = "";
          }}
        />
        <Button size="lg" className="w-full" onClick={() => fileInputRef.current?.click()}>
          Elegir fotos y videos
        </Button>

        {items.length > 0 && (
          <div className="flex flex-col rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setListOpen((current) => !current)}
              aria-expanded={listOpen}
              aria-controls="encuentro-upload-list"
              className="flex flex-col gap-1 p-3 text-left"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  {doneCount} de {items.length} archivo{items.length === 1 ? "" : "s"}
                  {failedCount > 0 && <span className="ml-2 text-danger">⚠ {failedCount} con error</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-medium">{overallPercent}%</span>
                  <svg
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      listOpen ? "rotate-180" : ""
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
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </button>

            {listOpen && (
              <ul id="encuentro-upload-list" className="flex flex-col gap-2 border-t border-border p-3 pt-2">
                {items.map((item) => {
                  const percent =
                    item.totalChunks > 0 ? Math.round((item.uploadedChunks / item.totalChunks) * 100) : 0;
                  return (
                    <li key={item.localId} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(item.file.size)}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.status === "retry-needed" || item.status === "failed" ? "bg-danger" : "bg-accent"
                          }`}
                          style={{ width: `${item.status === "done" ? 100 : percent}%` }}
                        />
                      </div>
                      {item.status === "retry-needed" && (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="text-xs text-danger">{item.error ?? "No se pudo subir"}</p>
                          <button
                            type="button"
                            className="shrink-0 text-xs font-medium text-accent hover:underline"
                            onClick={() => retryItem(item)}
                          >
                            Reintentar
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {showSuccess && (
          <div className="upload-success-pop flex flex-col items-center gap-2 rounded-2xl border border-success/40 bg-success/10 p-6 text-center">
            <p className="text-lg font-semibold text-success">¡Listo! Se subió todo.</p>
            <p className="text-sm text-muted-foreground">
              Tus fotos y videos quedaron guardados. Vas a poder verlos en la galería una vez
              que el equipo de Pakua los apruebe.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
