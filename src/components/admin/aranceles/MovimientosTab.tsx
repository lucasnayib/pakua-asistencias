"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OverflowMenu } from "@/components/ui/OverflowMenu";
import { Switch } from "@/components/ui/Switch";
import { formatDateEs, getLocalNow } from "@/lib/time";
import { formatMoney } from "@/lib/aranceles-calc";

const CATEGORIAS_INGRESO = ["CUOTAS", "DONACIONES", "VENTA_MERCHANDISING", "OTROS"] as const;
const CATEGORIAS_EGRESO = ["ALQUILER", "SERVICIOS", "INSUMOS", "MANTENIMIENTO", "SUELDOS", "OTROS"] as const;

// Igual a la duración de modal-out en la variante "-pop" de globals.css.
const CLOSE_ANIMATION_MS = 160;

type Movimiento = {
  id: string;
  tipo: "INGRESO" | "EGRESO";
  categoria: string;
  concepto: string;
  amount: number;
  date: string;
  estado: "PAGADO" | "NO_PAGADO";
  // Filas que en realidad son cuotas pagadas por un alumno (PagoArancel), mezcladas acá para
  // verlo todo junto — no son un MovimientoFinanciero real, así que no se editan ni se borran
  // como uno: se desmarcan pegándole al mismo endpoint que usa la ficha del alumno.
  source?: "movimiento" | "pago";
  studentId?: string;
  alumnoArancelId?: string | null;
  month?: string;
  numero?: string;
};

type TipoArancel = { id: string; name: string; amount: number };
type StudentOption = { id: string; firstName: string; lastName: string };

export function MovimientosTab() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [month, setMonth] = useState(() => getLocalNow().date.slice(0, 7));
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Movimiento | null>(null);
  const [formTipo, setFormTipo] = useState<"INGRESO" | "EGRESO">("EGRESO");
  const [formCategoria, setFormCategoria] = useState<string>(CATEGORIAS_EGRESO[0]);
  const [formConcepto, setFormConcepto] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(() => getLocalNow().date);
  const [formEstado, setFormEstado] = useState<"PAGADO" | "NO_PAGADO">("PAGADO");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Movimiento | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [tiposArancel, setTiposArancel] = useState<TipoArancel[]>([]);
  const [cuotaTipoId, setCuotaTipoId] = useState("");
  const [cuotaMonth, setCuotaMonth] = useState(() => getLocalNow().date.slice(0, 7));
  const [cuotaStudentQuery, setCuotaStudentQuery] = useState("");
  const [cuotaStudentResults, setCuotaStudentResults] = useState<StudentOption[]>([]);
  const [cuotaStudent, setCuotaStudent] = useState<StudentOption | null>(null);

  const loadMovimientos = useCallback(() => {
    setLoading(true);
    const url = showAllMonths ? "/api/aranceles/movimientos" : `/api/aranceles/movimientos?month=${month}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setMovimientos(data.movimientos ?? []))
      .finally(() => setLoading(false));
  }, [month, showAllMonths]);

  useEffect(() => {
    loadMovimientos();
  }, [loadMovimientos]);

  useEffect(() => {
    fetch("/api/aranceles/tipos")
      .then((r) => r.json())
      .then((data) => setTiposArancel(data.tipos ?? []))
      .catch(() => setTiposArancel([]));
  }, []);

  // Buscador de alumnos para la carga de cuota (categoría CUOTAS): sin esto, "cuota" quedaba
  // como un ingreso suelto sin dueño, y la lista de Alumnos nunca se enteraba de que se pagó.
  useEffect(() => {
    if (!cuotaStudentQuery.trim()) {
      setCuotaStudentResults([]);
      return;
    }
    const handle = setTimeout(() => {
      fetch(`/api/students?search=${encodeURIComponent(cuotaStudentQuery.trim())}`)
        .then((r) => r.json())
        .then((data) => setCuotaStudentResults(data.students ?? []))
        .catch(() => setCuotaStudentResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [cuotaStudentQuery]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (formOpen) {
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
  }, [formOpen]);

  function openCreate() {
    setEditing(null);
    setFormTipo("EGRESO");
    setFormCategoria(CATEGORIAS_EGRESO[0]);
    setFormConcepto("");
    setFormAmount("");
    setFormDate(getLocalNow().date);
    setFormEstado("PAGADO");
    setFormError(null);
    setCuotaTipoId("");
    setCuotaMonth(getLocalNow().date.slice(0, 7));
    setCuotaStudentQuery("");
    setCuotaStudentResults([]);
    setCuotaStudent(null);
    setFormOpen(true);
  }

  function openEdit(m: Movimiento) {
    setEditing(m);
    setFormTipo(m.tipo);
    setFormCategoria(m.categoria);
    setFormConcepto(m.concepto);
    setFormAmount(String(m.amount));
    setFormDate(m.date);
    setFormEstado(m.estado);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleCuotaSubmit() {
    if (!cuotaStudent || !cuotaTipoId) {
      setFormError("Elegí un alumno y una actividad");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      // ¿Ya está anotado a esa actividad? Si no, lo anota antes de poder marcarle el pago.
      const existingRes = await fetch(`/api/students/${cuotaStudent.id}/aranceles?month=${cuotaMonth}`);
      const existingData = await existingRes.json();
      let alumnoArancelId: string | undefined = existingData.aranceles?.find(
        (a: { tipoArancelId: string; id: string }) => a.tipoArancelId === cuotaTipoId
      )?.id;

      if (!alumnoArancelId) {
        const enrollRes = await fetch(`/api/students/${cuotaStudent.id}/aranceles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipoArancelId: cuotaTipoId }),
        });
        const enrollData = await enrollRes.json();
        if (!enrollRes.ok) {
          setFormError(enrollData.error ?? "No se pudo anotar al alumno");
          return;
        }
        alumnoArancelId = enrollData.enrollment.id;
      }

      const payRes = await fetch(`/api/students/${cuotaStudent.id}/aranceles/${alumnoArancelId}/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: cuotaMonth }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) {
        setFormError(payData.error ?? "No se pudo marcar la cuota como pagada");
        return;
      }
      toast.success("Cuota marcada como pagada");
      setFormOpen(false);
      loadMovimientos();
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (formTipo === "INGRESO" && formCategoria === "CUOTAS") {
      await handleCuotaSubmit();
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const amount = Math.round(Number(formAmount));
      if (!formConcepto.trim() || !Number.isFinite(amount) || amount <= 0) {
        setFormError("Completá concepto y monto válidos");
        return;
      }
      const body = {
        tipo: formTipo,
        categoria: formCategoria,
        concepto: formConcepto.trim(),
        amount,
        date: formDate,
        estado: formEstado,
      };
      const res = await fetch(editing ? `/api/aranceles/movimientos/${editing.id}` : "/api/aranceles/movimientos", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "No se pudo guardar");
        return;
      }
      toast.success(editing ? "Movimiento actualizado" : "Movimiento cargado");
      setFormOpen(false);
      loadMovimientos();
    } finally {
      setSaving(false);
    }
  }

  async function unmarkPago(m: Movimiento) {
    if (!m.studentId || !m.alumnoArancelId || !m.month) return;
    const res = await fetch(`/api/students/${m.studentId}/aranceles/${m.alumnoArancelId}/pagos?month=${m.month}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo desmarcar");
      return;
    }
    setMovimientos((current) => current.filter((item) => item.id !== m.id));
  }

  function toggleEstado(m: Movimiento) {
    if (m.source === "pago") {
      // Una cuota (PagoArancel) no tiene un estado "pendiente" propio: solo existe cuando
      // está pagada. Pasar el switch a "pendiente" la elimina de verdad, así que pide
      // confirmación primero (mismo diálogo que "Desmarcar pago" del menú) en vez de borrarla
      // al toque con un solo click.
      setDeleteTarget(m);
      return;
    }
    toggleEstadoMovimiento(m);
  }

  async function toggleEstadoMovimiento(m: Movimiento) {
    setTogglingId(m.id);
    const nextEstado = m.estado === "PAGADO" ? "NO_PAGADO" : "PAGADO";
    try {
      const res = await fetch(`/api/aranceles/movimientos/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nextEstado }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo actualizar");
        return;
      }
      setMovimientos((current) => current.map((item) => (item.id === m.id ? { ...item, estado: nextEstado } : item)));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.source === "pago") {
        await unmarkPago(deleteTarget);
        toast.success("Cuota desmarcada como pagada");
        setDeleteTarget(null);
        return;
      }
      const res = await fetch(`/api/aranceles/movimientos/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo eliminar");
        return;
      }
      toast.success("Movimiento eliminado");
      setDeleteTarget(null);
      loadMovimientos();
    } finally {
      setDeleting(false);
    }
  }

  const categoriasDisponibles = formTipo === "INGRESO" ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;

  const filteredMovimientos = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return movimientos;
    return movimientos.filter(
      (m) => m.concepto.toLowerCase().includes(query) || (m.numero ?? "").toLowerCase().includes(query)
    );
  }, [movimientos, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={showAllMonths}
            className="w-40 disabled:opacity-50"
          />
          <Switch checked={showAllMonths} onChange={setShowAllMonths} label="Ver todos" />
          <Input
            placeholder="Buscar por nombre o N.° de recibo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
        <div className="flex gap-2">
          <a
            href={showAllMonths ? "/api/aranceles/movimientos/export?month=all" : `/api/aranceles/movimientos/export?month=${month}`}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-surface-2 px-3 text-sm font-medium text-foreground transition hover:bg-surface"
          >
            {showAllMonths ? "Exportar todo" : "Exportar mes"}
          </a>
          <Button size="sm" onClick={openCreate} data-tour="btn-nuevo-movimiento">
            Nuevo movimiento
          </Button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          setFormOpen(false);
        }}
        className="modal-dialog modal-dialog-pop m-auto w-[min(92vw,30rem)] rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-6">
          <h2 className="mb-1 text-lg font-semibold">
            {editing ? "Editar movimiento" : "Nuevo movimiento"}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Tipo"
              value={formTipo}
              onChange={(e) => {
                const tipo = e.target.value as "INGRESO" | "EGRESO";
                setFormTipo(tipo);
                setFormCategoria(tipo === "INGRESO" ? CATEGORIAS_INGRESO[0] : CATEGORIAS_EGRESO[0]);
              }}
            >
              <option value="EGRESO">Egreso</option>
              <option value="INGRESO">Ingreso</option>
            </Select>
            <Select label="Categoría" value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)}>
              {categoriasDisponibles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          {formTipo === "INGRESO" && formCategoria === "CUOTAS" ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Alumno</p>
              {cuotaStudent ? (
                <div className="flex items-center justify-between gap-2 rounded-md bg-surface px-2 py-1.5 text-sm">
                  <span className="font-medium">
                    {cuotaStudent.lastName}, {cuotaStudent.firstName}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:underline"
                    onClick={() => {
                      setCuotaStudent(null);
                      setCuotaStudentQuery("");
                    }}
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Buscar por nombre o apellido…"
                    value={cuotaStudentQuery}
                    onChange={(e) => setCuotaStudentQuery(e.target.value)}
                  />
                  {cuotaStudentResults.length > 0 && (
                    <ul className="flex max-h-32 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border">
                      {cuotaStudentResults.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setCuotaStudent(s);
                              setCuotaStudentResults([]);
                            }}
                            className="flex w-full items-center px-2 py-1.5 text-left text-sm hover:bg-surface"
                          >
                            {s.lastName}, {s.firstName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Actividad</p>
              {tiposArancel.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no hay ninguna cargada. Definilas en la pestaña &quot;Coste de
                  actividades&quot;.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {tiposArancel.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setCuotaTipoId(t.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-surface ${
                          cuotaTipoId === t.id ? "bg-surface font-medium" : ""
                        }`}
                      >
                        <span>{t.name}</span>
                        <span className="text-xs text-muted-foreground">{formatMoney(t.amount)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <Input label="Mes" type="month" value={cuotaMonth} onChange={(e) => setCuotaMonth(e.target.value)} />
            </div>
          ) : (
            <>
              <Input label="Concepto" value={formConcepto} onChange={(e) => setFormConcepto(e.target.value)} required />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Monto"
                  type="number"
                  min={1}
                  step={1}
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                />
                <Input label="Fecha" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required />
              </div>
              <Select label="Estado" value={formEstado} onChange={(e) => setFormEstado(e.target.value as "PAGADO" | "NO_PAGADO")}>
                <option value="PAGADO">Pagado</option>
                <option value="NO_PAGADO">No pagado</option>
              </Select>
            </>
          )}
          {formError && <p className="text-xs text-danger">{formError}</p>}
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              Guardar
            </Button>
          </div>
        </form>
      </dialog>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" /> Cargando…
        </div>
      ) : movimientos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {showAllMonths ? "Todavía no hay movimientos cargados." : "No hay movimientos cargados este mes."}
        </p>
      ) : filteredMovimientos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nada coincide con &quot;{search}&quot;.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {filteredMovimientos.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{m.concepto}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateEs(m.date)} · {m.categoria}
                  {m.numero && ` · N.° ${m.numero}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={m.tipo === "INGRESO" ? "text-success" : "text-danger"}>
                  {m.tipo === "INGRESO" ? "+" : "-"}
                  {formatMoney(m.amount)}
                </span>
                <span className={`text-xs font-medium ${m.estado === "PAGADO" ? "text-success" : "text-danger"}`}>
                  {m.estado === "PAGADO" ? "Pagado ✓" : "Pendiente"}
                </span>
                <Switch
                  checked={m.estado === "PAGADO"}
                  onChange={() => toggleEstado(m)}
                  disabled={togglingId === m.id}
                />
                <OverflowMenu
                  items={[
                    ...(m.tipo === "INGRESO" && m.estado === "PAGADO"
                      ? [
                          {
                            label: "Imprimir recibo",
                            onSelect: () =>
                              window.open(`/api/aranceles/movimientos/recibo?id=${encodeURIComponent(m.id)}`, "_blank"),
                          },
                        ]
                      : []),
                    ...(m.source === "pago"
                      ? [{ label: "Desmarcar pago", onSelect: () => setDeleteTarget(m), danger: true }]
                      : [
                          { label: "Editar", onSelect: () => openEdit(m) },
                          { label: "Eliminar", onSelect: () => setDeleteTarget(m), danger: true },
                        ]),
                  ]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.source === "pago" ? "Desmarcar cuota pagada" : "Eliminar movimiento"}
        message={
          deleteTarget
            ? deleteTarget.source === "pago"
              ? `"${deleteTarget.concepto}" vuelve a quedar pendiente este mes.`
              : `Se eliminará "${deleteTarget.concepto}" ($${deleteTarget.amount}).`
            : undefined
        }
        confirmLabel={deleteTarget?.source === "pago" ? "Desmarcar" : "Eliminar"}
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
