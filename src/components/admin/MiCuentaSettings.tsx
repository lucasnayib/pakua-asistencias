"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Card } from "@/components/ui/Card";

type EmailStep = "idle" | "code-sent";
type PasswordStep = "idle" | "code-sent";

export function MiCuentaSettings({ initialContactEmail }: { initialContactEmail: string | null }) {
  const [contactEmail, setContactEmail] = useState(initialContactEmail);

  // --- Mail de contacto ---
  const [emailStep, setEmailStep] = useState<EmailStep>("idle");
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function requestEmailChange(e: FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailLoading(true);
    try {
      const res = await fetch("/api/admin/contact-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error ?? "No se pudo enviar el código");
        return;
      }
      setEmailStep("code-sent");
      toast.success(`Te mandamos un código a ${newEmail}`);
    } catch {
      setEmailError("Error de conexión");
    } finally {
      setEmailLoading(false);
    }
  }

  async function confirmEmailChange(e: FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailLoading(true);
    try {
      const res = await fetch("/api/admin/contact-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: emailCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error ?? "No se pudo confirmar el código");
        return;
      }
      setContactEmail(data.contactEmail);
      setEmailStep("idle");
      setNewEmail("");
      setEmailCode("");
      toast.success("Mail de contacto actualizado");
    } catch {
      setEmailError("Error de conexión");
    } finally {
      setEmailLoading(false);
    }
  }

  // --- Contraseña ---
  const [passwordStep, setPasswordStep] = useState<PasswordStep>("idle");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordCode, setPasswordCode] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function requestPasswordChange(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/admin/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error ?? "No se pudo enviar el código");
        return;
      }
      setPasswordStep("code-sent");
      toast.success(`Te mandamos un código a ${contactEmail}`);
    } catch {
      setPasswordError("Error de conexión");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function confirmPasswordChange(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/admin/password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: passwordCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error ?? "No se pudo confirmar el código");
        return;
      }
      setPasswordStep("idle");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordCode("");
      toast.success("Contraseña actualizada");
    } catch {
      setPasswordError("Error de conexión");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="max-w-md p-6">
        <h2 className="text-lg font-semibold">Mail de contacto</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Actual: {contactEmail ?? <span className="italic">sin mail cargado</span>}
        </p>

        {emailStep === "idle" ? (
          <form onSubmit={requestEmailChange} className="mt-4 flex flex-col gap-4">
            <Input
              label="Mail nuevo"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            {emailError && <p className="text-sm text-danger">{emailError}</p>}
            <Button type="submit" loading={emailLoading} className="w-full">
              Enviar código
            </Button>
          </form>
        ) : (
          <form onSubmit={confirmEmailChange} className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Ingresá el código de 6 dígitos que te mandamos a {newEmail}.
            </p>
            <Input
              label="Código"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              required
            />
            {emailError && <p className="text-sm text-danger">{emailError}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setEmailStep("idle");
                  setEmailCode("");
                  setEmailError(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={emailLoading} className="flex-1">
                Confirmar
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Card className="max-w-md p-6">
        <h2 className="text-lg font-semibold">Contraseña</h2>
        {!contactEmail && (
          <p className="mt-1 text-sm text-muted-foreground">
            Necesitás cargar un mail de contacto (arriba) antes de poder cambiar tu contraseña.
          </p>
        )}

        {contactEmail && passwordStep === "idle" && (
          <form onSubmit={requestPasswordChange} className="mt-4 flex flex-col gap-4">
            <PasswordInput
              label="Contraseña nueva"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
            <PasswordInput
              label="Repetir contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
            {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
            <Button type="submit" loading={passwordLoading} className="w-full">
              Enviar código
            </Button>
          </form>
        )}

        {contactEmail && passwordStep === "code-sent" && (
          <form onSubmit={confirmPasswordChange} className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Ingresá el código de 6 dígitos que te mandamos a {contactEmail}.
            </p>
            <Input
              label="Código"
              value={passwordCode}
              onChange={(e) => setPasswordCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              required
            />
            {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setPasswordStep("idle");
                  setPasswordCode("");
                  setPasswordError(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={passwordLoading} className="flex-1">
                Confirmar
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
