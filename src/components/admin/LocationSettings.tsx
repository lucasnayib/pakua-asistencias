"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";

type Props = {
  initialLatitude: number | null;
  initialLongitude: number | null;
  initialRadius: number | null;
};

/**
 * La lat/long no se muestran ni se editan a mano: la única forma de fijar la ubicación es
 * buscando una dirección (geocode), que guarda las coordenadas resueltas en este estado interno
 * sin exponerlas en la UI. El switch solo refleja/activa "hay una ubicación guardada o no".
 */
export function LocationSettings({ initialLatitude, initialLongitude, initialRadius }: Props) {
  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const [radius, setRadius] = useState(initialRadius !== null ? String(initialRadius) : "150");
  const [enabled, setEnabled] = useState(initialLatitude !== null && initialLongitude !== null);
  const [address, setAddress] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function saveLocation(lat: number, lng: number): Promise<boolean> {
    setSaving(true);
    try {
      const rad = radius.trim() === "" ? 150 : Number(radius);
      const res = await fetch("/api/admin/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng, attendanceRadiusMeters: rad }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo guardar");
        return false;
      }
      setLatitude(lat);
      setLongitude(lng);
      setEnabled(true);
      toast.success("Ubicación guardada");
      return true;
    } catch {
      toast.error("Error de conexión");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function searchAddress() {
    if (!address.trim()) {
      toast.error("Escribí una dirección primero");
      return;
    }
    setGeocoding(true);
    setResolvedAddress(null);
    try {
      const res = await fetch("/api/admin/location/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo buscar la dirección");
        return;
      }
      const ok = await saveLocation(data.latitude, data.longitude);
      if (ok) setResolvedAddress(data.formattedAddress);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setGeocoding(false);
    }
  }

  async function handleToggle(next: boolean) {
    if (!next) {
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
        setEnabled(false);
        setLatitude(null);
        setLongitude(null);
        toast.success("Restricción de ubicación desactivada");
      } catch {
        toast.error("Error de conexión");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (latitude === null || longitude === null) {
      toast.error("Buscá y confirmá una dirección primero");
      return;
    }
    await saveLocation(latitude, longitude);
  }

  async function handleRadiusSave() {
    if (latitude === null || longitude === null) return;
    await saveLocation(latitude, longitude);
  }

  return (
    <Card className="max-w-md p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Restricción por ubicación</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {enabled
              ? "Activada: solo se puede marcar asistencia estando dentro del radio configurado."
              : "Desactivada: cualquiera puede marcar asistencia sin restricción de ubicación."}
          </p>
        </div>
        <Switch checked={enabled} onChange={handleToggle} disabled={saving} label="Activar" />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Buscar por dirección"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    searchAddress();
                  }
                }}
                placeholder="Av. Colón 1234, Córdoba"
              />
            </div>
            <Button type="button" variant="secondary" loading={geocoding} onClick={searchAddress}>
              Buscar
            </Button>
          </div>
          {resolvedAddress && <p className="text-xs text-muted-foreground">Encontrado: {resolvedAddress}</p>}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Radio permitido (metros)"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              inputMode="numeric"
              placeholder="150"
            />
          </div>
          {enabled && (
            <Button type="button" variant="secondary" loading={saving} onClick={handleRadiusSave}>
              Guardar radio
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
