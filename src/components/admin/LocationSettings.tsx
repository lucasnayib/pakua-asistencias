"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type Props = {
  initialLatitude: number | null;
  initialLongitude: number | null;
  initialRadius: number | null;
};

export function LocationSettings({ initialLatitude, initialLongitude, initialRadius }: Props) {
  const [latitude, setLatitude] = useState(initialLatitude !== null ? String(initialLatitude) : "");
  const [longitude, setLongitude] = useState(initialLongitude !== null ? String(initialLongitude) : "");
  const [radius, setRadius] = useState(initialRadius !== null ? String(initialRadius) : "150");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const enabled = initialLatitude !== null && initialLongitude !== null && initialRadius !== null;

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Este navegador no soporta geolocalización");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
        setLocating(false);
        toast.success("Ubicación actual cargada");
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error("Le negaste el permiso de ubicación al navegador");
        } else {
          toast.error("No se pudo obtener tu ubicación actual");
        }
      },
      { enableHighAccuracy: true, timeout: 15_000 }
    );
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const lat = latitude.trim() === "" ? null : Number(latitude);
      const lng = longitude.trim() === "" ? null : Number(longitude);
      const rad = radius.trim() === "" ? null : Number(radius);
      const res = await fetch("/api/admin/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng, attendanceRadiusMeters: rad }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo guardar");
        return;
      }
      toast.success("Ubicación guardada");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: null, longitude: null, attendanceRadiusMeters: null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo desactivar");
        return;
      }
      setLatitude("");
      setLongitude("");
      toast.success("Restricción de ubicación desactivada");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-md p-6">
      <h2 className="text-lg font-semibold">Restricción por ubicación</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {enabled
          ? "Activada: solo se puede marcar asistencia estando dentro del radio configurado."
          : "Desactivada: cualquiera puede marcar asistencia sin restricción de ubicación."}
      </p>

      <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
        <Button type="button" variant="secondary" loading={locating} onClick={useCurrentLocation}>
          Usar mi ubicación actual
        </Button>

        <Input
          label="Latitud"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          inputMode="decimal"
          placeholder="-31.4201"
        />
        <Input
          label="Longitud"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          inputMode="decimal"
          placeholder="-64.1888"
        />
        <Input
          label="Radio permitido (metros)"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          inputMode="numeric"
          placeholder="150"
        />

        <div className="flex gap-2">
          <Button type="submit" loading={saving} className="flex-1">
            Guardar
          </Button>
          {enabled && (
            <Button type="button" variant="danger" disabled={saving} onClick={handleDisable}>
              Desactivar
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
