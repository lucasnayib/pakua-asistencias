"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export function ItineranciaAccessCodeSettings() {
  const [loading, setLoading] = useState(true);
  const [hasCode, setHasCode] = useState(false);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/itinerancia-access-code")
      .then((res) => res.json())
      .then((data: { hasCode: boolean }) => setHasCode(data.hasCode))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.trim().length < 4) {
      toast.error("El código debe tener al menos 4 caracteres");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/itinerancia-access-code", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo guardar");
        return;
      }
      setHasCode(true);
      setCode("");
      toast.success("Código de Itinerancias guardado — ya podés repartirlo");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <Card className="max-w-md p-6">
      <h2 className="text-lg font-semibold">Código de acceso a Itinerancias</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasCode
          ? "Ya hay un código configurado. Los alumnos lo usan para entrar a Itinerancias desde su celular — es distinto de la contraseña de la escuela."
          : "Todavía no configuraste un código. Sin uno, nadie puede entrar a Itinerancias desde su celular."}
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-2">
        <Input
          label={hasCode ? "Cambiar código" : "Definir código"}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ej: itinerancia2026"
          className="flex-1"
        />
        <Button type="submit" loading={saving}>
          Guardar
        </Button>
      </form>
    </Card>
  );
}
