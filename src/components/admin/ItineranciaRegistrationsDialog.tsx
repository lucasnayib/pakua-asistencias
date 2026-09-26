"use client";

import { Fragment, FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Switch } from "@/components/ui/Switch";
import { ItineranciaGraduationDialog } from "@/components/admin/ItineranciaGraduationDialog";
import { formatDateEs } from "@/lib/time";
import type { ItineranciaActivityListItem, ItineranciaRegisteredStudent } from "@/types";

type ItineranciaRegistrationsDialogProps = {
  open: boolean;
  activity: ItineranciaActivityListItem | null;
  onClose: () => void;
  onChanged: () => void;
};

export function ItineranciaRegistrationsDialog({
  open,
  activity,
  onClose,
  onChanged,
}: ItineranciaRegistrationsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<ItineranciaRegisteredStudent[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [gradingStudent, setGradingStudent] = useState<ItineranciaRegisteredStudent | null>(null);
  const [togglingDeliveryId, setTogglingDeliveryId] = useState<string | null>(null);
  const [deliveryFormFor, setDeliveryFormFor] = useState<ItineranciaRegisteredStudent | null>(null);
  const [deliveryDraft, setDeliveryDraft] = useState("");

  const allowsGraduation = activity?.category === "EVALUACION" || activity?.category === "COMPENSATORIOS";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open || !activity) return;
    setLoading(true);
    fetch(`/api/itinerancias/activities/${activity.id}/registrations`)
      .then((res) => res.json())
      .then((data) => setStudents(data.students ?? []))
      .finally(() => setLoading(false));
  }, [open, activity]);

  async function handleRemove(student: ItineranciaRegisteredStudent) {
    if (!activity) return;
    setRemovingId(student.id);
    try {
      const res = await fetch(`/api/itinerancias/activities/${activity.id}/registrations`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo quitar la inscripción");
        return;
      }
      setStudents((current) => current.filter((s) => s.id !== student.id));
      toast.success(`${student.firstName} ${student.lastName} — inscripción quitada`);
      onChanged();
    } finally {
      setRemovingId(null);
    }
  }

  // Mismo criterio que ya usa StudentDetailsDialog para la graduación actual: pasar a
  // "pendiente" es directo, pasar a "entregado" pide la fecha primero.
  async function handleMarkNotDelivered(student: ItineranciaRegisteredStudent) {
    setTogglingDeliveryId(student.id);
    try {
      const formData = new FormData();
      formData.set("graduacionDelivered", "false");
      formData.set("graduacionDeliveredAt", "");
      const res = await fetch(`/api/students/${student.id}`, { method: "PATCH", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo actualizar");
        return;
      }
      setStudents((current) =>
        current.map((s) => (s.id === student.id ? { ...s, graduacionDelivered: false, graduacionDeliveredAt: null } : s))
      );
    } finally {
      setTogglingDeliveryId(null);
    }
  }

  function handleDeliveryToggle(student: ItineranciaRegisteredStudent) {
    if (student.graduacionDelivered) {
      handleMarkNotDelivered(student);
    } else {
      setDeliveryDraft("");
      setDeliveryFormFor(student);
    }
  }

  async function handleDeliverySubmit(e: FormEvent) {
    e.preventDefault();
    if (!deliveryFormFor) return;
    setTogglingDeliveryId(deliveryFormFor.id);
    try {
      const formData = new FormData();
      formData.set("graduacionDelivered", "true");
      formData.set("graduacionDeliveredAt", deliveryDraft);
      const res = await fetch(`/api/students/${deliveryFormFor.id}`, { method: "PATCH", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo actualizar");
        return;
      }
      const deliveredId = deliveryFormFor.id;
      setStudents((current) =>
        current.map((s) => (s.id === deliveredId ? { ...s, graduacionDelivered: true, graduacionDeliveredAt: deliveryDraft || null } : s))
      );
      setDeliveryFormFor(null);
    } finally {
      setTogglingDeliveryId(null);
    }
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
        className="m-auto w-[min(95vw,56rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold">Inscriptos — {activity?.title}</h2>

          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" /> Cargando…
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nadie anotado todavía.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Alumno</th>
                    {allowsGraduation && <th className="px-4 py-3">Graduación actual</th>}
                    {allowsGraduation && <th className="px-4 py-3">Entrega</th>}
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((s) => {
                    const showGraduation = allowsGraduation && s.formacion !== "Gym" && !!s.graduacion;
                    const colSpan = allowsGraduation ? 4 : 2;
                    return (
                      <Fragment key={s.id}>
                        <tr className="bg-surface align-top">
                          <td className="px-4 py-3 font-medium">
                            {s.firstName} {s.lastName}
                          </td>
                          {allowsGraduation && (
                            <td className="px-4 py-3 text-muted-foreground">
                              {s.formacion !== "Gym" ? (s.graduacion ?? "—") : "—"}
                            </td>
                          )}
                          {allowsGraduation && (
                            <td className="px-4 py-3">
                              {showGraduation ? (
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs ${s.graduacionDelivered ? "text-success" : "text-muted-foreground"}`}
                                  >
                                    {s.graduacionDelivered
                                      ? `Entregado ✓${s.graduacionDeliveredAt ? ` ${formatDateEs(s.graduacionDeliveredAt)}` : ""}`
                                      : "Pendiente"}
                                  </span>
                                  <Switch
                                    checked={s.graduacionDelivered}
                                    onChange={() => handleDeliveryToggle(s)}
                                    disabled={togglingDeliveryId === s.id}
                                  />
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {allowsGraduation && s.formacion !== "Gym" && (
                                <button
                                  className="text-muted-foreground hover:underline"
                                  onClick={() => setGradingStudent(s)}
                                >
                                  Nueva graduación
                                </button>
                              )}
                              <button
                                className="text-danger hover:underline disabled:opacity-50"
                                disabled={removingId === s.id}
                                onClick={() => handleRemove(s)}
                              >
                                Quitar
                              </button>
                            </div>
                          </td>
                        </tr>
                        {deliveryFormFor?.id === s.id && (
                          <tr className="bg-surface">
                            <td colSpan={colSpan} className="px-4 pb-4">
                              <form
                                onSubmit={handleDeliverySubmit}
                                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:max-w-xs"
                              >
                                <Input
                                  label="¿Cuándo fue entregado?"
                                  type="date"
                                  value={deliveryDraft}
                                  onChange={(e) => setDeliveryDraft(e.target.value)}
                                  required
                                  autoFocus
                                />
                                <div className="mt-1 flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeliveryFormFor(null)}
                                    disabled={togglingDeliveryId === s.id}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button type="submit" size="sm" loading={togglingDeliveryId === s.id}>
                                    Guardar
                                  </Button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-2 flex justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </dialog>

      <ItineranciaGraduationDialog
        open={gradingStudent !== null}
        student={gradingStudent}
        evaluationDate={activity?.date ?? ""}
        onClose={() => setGradingStudent(null)}
        onSaved={(updated) => {
          setStudents((current) =>
            current.map((s) => (s.id === gradingStudent?.id ? { ...s, ...updated } : s))
          );
          onChanged();
        }}
      />
    </>
  );
}
