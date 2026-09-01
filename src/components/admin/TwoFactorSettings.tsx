"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type Step = "idle" | "scanning" | "backup-codes";

export function TwoFactorSettings({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [step, setStep] = useState<Step>("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/two-factor/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo generar el código");
        return;
      }
      setQrDataUrl(data.qrDataUrl);
      setSecret(data.secret);
      setStep("scanning");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function confirmCode() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/two-factor/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo confirmar el código");
        return;
      }
      setBackupCodes(data.backupCodes);
      setEnabled(true);
      setStep("backup-codes");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/two-factor/disable", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo desactivar");
        return;
      }
      setEnabled(false);
      setStep("idle");
      setQrDataUrl(null);
      setSecret(null);
      setCode("");
      setBackupCodes([]);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  if (step === "backup-codes") {
    return (
      <Card className="max-w-md p-6">
        <h2 className="text-lg font-semibold">2FA activado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Guardá estos códigos de respaldo en un lugar seguro. Cada uno sirve una sola vez, y no
          se van a volver a mostrar.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-surface-2 p-4 font-mono text-sm">
          {backupCodes.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <Button className="mt-4 w-full" onClick={() => setStep("idle")}>
          Listo, ya los guardé
        </Button>
      </Card>
    );
  }

  if (step === "scanning") {
    return (
      <Card className="max-w-md p-6">
        <h2 className="text-lg font-semibold">Escaneá el código QR</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Usá Google Authenticator, Authy, o cualquier app compatible con TOTP.
        </p>
        {qrDataUrl && (
          <Image src={qrDataUrl} alt="Código QR de 2FA" width={200} height={200} className="mx-auto my-4" unoptimized />
        )}
        {secret && (
          <p className="mb-4 break-all text-center text-xs text-muted-foreground">
            O ingresalo manualmente: <span className="font-mono">{secret}</span>
          </p>
        )}
        <Input
          label="Código de 6 dígitos"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          inputMode="numeric"
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setStep("idle")}>
            Cancelar
          </Button>
          <Button className="flex-1" loading={loading} onClick={confirmCode}>
            Confirmar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-md p-6">
      <h2 className="text-lg font-semibold">Autenticación en dos pasos</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {enabled
          ? "Está activada. Vas a necesitar un código de tu app de autenticación cada vez que inicies sesión."
          : "Agregá una capa extra de seguridad a tu cuenta de super-admin con una app de autenticación."}
      </p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {enabled ? (
        <Button variant="danger" className="mt-4 w-full" loading={loading} onClick={disable}>
          Desactivar 2FA
        </Button>
      ) : (
        <Button className="mt-4 w-full" loading={loading} onClick={startSetup}>
          Activar 2FA
        </Button>
      )}
    </Card>
  );
}
