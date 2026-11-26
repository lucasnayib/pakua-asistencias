"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OverflowMenu } from "@/components/ui/OverflowMenu";
import { Switch } from "@/components/ui/Switch";
import { SidebarIcon } from "@/components/admin/SidebarIcon";
import { SolicitarBorradoDialog } from "@/components/admin/aranceles/SolicitarBorradoDialog";
import { PorcentajeFederacionDialog } from "@/components/admin/aranceles/PorcentajeFederacionDialog";
import { CompletarPagoDialog } from "@/components/admin/aranceles/CompletarPagoDialog";
import { formatDateEs, getLocalNow } from "@/lib/time";
import { formatMoney, formatMonth } from "@/lib/aranceles-calc";
import { CATEGORIAS_EGRESO, CATEGORIAS_INGRESO } from "@/lib/validations";

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
  // true desde que se exportó su recibo: ya no se puede borrar/desmarcar directo, solo pedirle
  // el borrado al superadmin (ver SolicitarBorradoDialog).
  locked?: boolean;
  requestPending?: boolean;
  // Solo tiene valor en filas INGRESO de categoría FEDERACION.
  escuelaPorcentaje?: number | null;
  // Solo tiene valor en pagos de CUOTAS marcados como "pago parcial".
  porcentajePagado?: number | null;
  // Solo relevante cuando porcentajePagado no es null: false = todavía falta que el alumno
  // pague el resto (ver CompletarPagoDialog).
  pagoCompletado?: boolean;
};

type TipoArancel = { id: string; name: string; categoria: string; federacionPorcentaje?: number | null };
type StudentOption = { id: string; firstName: string; lastName: string };

export function MovimientosTab() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [month, setMonth] = useState(() => getLocalNow().date.slice(0, 7));
  const [mesesConDatos, setMesesConDatos] = useState<string[]>(() => [getLocalNow().date.slice(0, 7)]);
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
  const [reciboWarningTarget, setReciboWarningTarget] = useState<Movimiento | null>(null);
  const [solicitarTarget, setSolicitarTarget] = useState<Movimiento | null>(null);
  const [porcentajeTarget, setPorcentajeTarget] = useState<Movimiento | null>(null);
  const [completarTarget, setCompletarTarget] = useState<Movimiento | null>(null);

  const [tiposArancel, setTiposArancel] = useState<TipoArancel[]>([]);
  const [cuotaTipoId, setCuotaTipoId] = useState("");
  const [cuotaEscuelaPorcentaje, setCuotaEscuelaPorcentaje] = useState("");
  const [cuotaEsParcial, setCuotaEsParcial] = useState(false);
  const [cuotaPorcentajePagado, setCuotaPorcentajePagado] = useState("");
  // Fecha real en que se pagó la cuota — de acá se deriva el "mes" que la identifica para el
  // recibo y los movimientos (cuotaMonth más abajo), ya no se elige por separado.
  const [cuotaDate, setCuotaDate] = useState(() => getLocalNow().date);
  const cuotaMonth = cuotaDate.slice(0, 7);
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

  // Meses disponibles para el desplegable del filtro (ver más abajo): solo los que ya tienen
  // algún movimiento/pago cargado, más el mes actual. Se recarga junto con la lista para que un
  // movimiento recién cargado en un mes nuevo aparezca en el desplegable sin recargar la página.
  const loadMesesConDatos = useCallback(() => {
    fetch("/api/aranceles/movimientos/meses")
      .then((r) => r.json())
      .then((data) => setMesesConDatos(data.meses ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadMovimientos();
  }, [loadMovimientos]);

  useEffect(() => {
    loadMesesConDatos();
  }, [loadMesesConDatos]);

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
    setCuotaEscuelaPorcentaje("");
    setCuotaEsParcial(false);
    setCuotaPorcentajePagado("");
    setCuotaDate(getLocalNow().date);
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
    const amount = Math.round(Number(formAmount));
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Completá un monto válido");
      return;
    }
    let escuelaPorcentaje: number | undefined;
    if (formCategoria === "FEDERACION") {
      const pct = Math.round(Number(cuotaEscuelaPorcentaje));
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        setFormError("Completá el % que le queda a la escuela (entre 0 y 100)");
        return;
      }
      escuelaPorcentaje = pct;
    }
    let porcentajePagado: number | undefined;
    if (formCategoria === "CUOTAS" && cuotaEsParcial) {
      const pct = Math.round(Number(cuotaPorcentajePagado));
      if (!Number.isFinite(pct) || pct < 1 || pct > 99) {
        setFormError("Completá el % de la cuota que se está pagando (entre 1 y 99)");
        return;
      }
      porcentajePagado = pct;
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
        body: JSON.stringify({ month: cuotaMonth, date: cuotaDate, amount, escuelaPorcentaje, porcentajePagado }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) {
        setFormError(payData.error ?? "No se pudo marcar la cuota como pagada");
        return;
      }
      toast.success("Cuota marcada como pagada");
      setFormOpen(false);
      loadMovimientos();
      loadMesesConDatos();
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (esCategoriaCuota) {
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
      loadMesesConDatos();
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
      requestDelete(m);
      return;
    }
    toggleEstadoMovimiento(m);
  }

  // Punto único de entrada para borrar/desmarcar, tanto desde el switch de estado como desde
  // el menú de opciones: si ya se exportó el recibo, no deja borrar directo.
  function requestDelete(m: Movimiento) {
    if (!m.locked) {
      setDeleteTarget(m);
      return;
    }
    if (m.requestPending) {
      toast.info("Ya hay una solicitud de borrado pendiente de aprobación del superadmin para esto.");
      return;
    }
    setSolicitarTarget(m);
  }

  // Carga o corrige el % que le queda a la escuela en un pago/movimiento de FEDERACION ya
  // existente — ver PorcentajeFederacionDialog. No pisa monto ni mes, solo este dato.
  async function handlePorcentajeSubmit(porcentaje: number): Promise<{ ok: boolean; error?: string }> {
    if (!porcentajeTarget) return { ok: false, error: "Nada seleccionado" };
    const res =
      porcentajeTarget.source === "pago"
        ? await fetch(
            `/api/students/${porcentajeTarget.studentId}/aranceles/${porcentajeTarget.alumnoArancelId}/pagos`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ month: porcentajeTarget.month, escuelaPorcentaje: porcentaje }),
            }
          )
        : await fetch(`/api/aranceles/movimientos/${porcentajeTarget.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ escuelaPorcentaje: porcentaje }),
          });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error };
    return { ok: true };
  }

  // Marca un pago parcial (CUOTAS) como completado: suma lo que el alumno pagó ahora del resto
  // al monto ya registrado — ver CompletarPagoDialog y el PATCH de pagos/route.ts.
  async function handleCompletarSubmit(montoAdicional: number): Promise<{ ok: boolean; error?: string }> {
    if (!completarTarget?.studentId || !completarTarget.alumnoArancelId || !completarTarget.month) {
      return { ok: false, error: "Nada seleccionado" };
    }
    const res = await fetch(
      `/api/students/${completarTarget.studentId}/aranceles/${completarTarget.alumnoArancelId}/pagos`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: completarTarget.month, montoAdicional }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error };
    return { ok: true };
  }

  async function handleSolicitarBorrado(reason: string): Promise<{ ok: boolean; error?: string }> {
    if (!solicitarTarget) return { ok: false, error: "Nada seleccionado" };
    const res = await fetch("/api/aranceles/movimientos/solicitudes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: solicitarTarget.id, reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error };
    return { ok: true };
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

  // Exportar el recibo (primera vez o reimpresión) siempre deja el movimiento bloqueado del
  // lado del servidor (ver /api/aranceles/movimientos/recibo); acá solo reflejamos ese cambio
  // en el estado local al toque, sin esperar a recargar toda la lista.
  function abrirRecibo(m: Movimiento) {
    window.open(`/api/aranceles/movimientos/recibo?id=${encodeURIComponent(m.id)}`, "_blank");
    if (!m.locked) {
      setMovimientos((current) => current.map((item) => (item.id === m.id ? { ...item, locked: true } : item)));
    }
  }

  const categoriasDisponibles = formTipo === "INGRESO" ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;
  // Categorías que arman un pago de cuota (alumno + actividad + mes) en vez de un movimiento
  // suelto: CUOTAS (100% ingreso propio) y FEDERACION (solo un % es ingreso propio, el resto se
  // le pasa a la federación — ver montoIngresoPropio en aranceles-calc.ts), ambas con la misma
  // mecánica de alumno + actividad + mes, FEDERACION con el % extra.
  const esCategoriaCuota = formTipo === "INGRESO" && (formCategoria === "CUOTAS" || formCategoria === "FEDERACION");
  const tiposArancelDeLaCategoria = tiposArancel.filter((t) => t.categoria === formCategoria);

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
          <Select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={showAllMonths}
            className="w-48 disabled:opacity-50"
          >
            {mesesConDatos.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </Select>
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
        className="modal-dialog modal-dialog-pop scrollbar-themed m-auto max-h-[85vh] w-[min(92vw,30rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50"
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
            <Select
              label="Categoría"
              value={formCategoria}
              onChange={(e) => {
                setFormCategoria(e.target.value);
                setCuotaTipoId("");
              }}
            >
              {categoriasDisponibles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          {esCategoriaCuota ? (
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
              {tiposArancelDeLaCategoria.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no hay ninguna actividad con categoría {formCategoria}. Definilas en la
                  pestaña &quot;Actividades&quot;.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {tiposArancelDeLaCategoria.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setCuotaTipoId(t.id);
                          if (formCategoria === "FEDERACION") {
                            setCuotaEscuelaPorcentaje(t.federacionPorcentaje != null ? String(t.federacionPorcentaje) : "");
                          }
                        }}
                        className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-surface ${
                          cuotaTipoId === t.id ? "bg-surface font-medium" : ""
                        }`}
                      >
                        {t.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

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
                <DatePicker label="Fecha" value={cuotaDate} onChange={setCuotaDate} align="right" />
              </div>

              {formCategoria === "CUOTAS" && (
                <div className="flex flex-col gap-1">
                  <Switch checked={cuotaEsParcial} onChange={setCuotaEsParcial} label="Pago parcial" />
                  {cuotaEsParcial && (
                    <Input
                      label="% de la cuota que se está pagando"
                      type="number"
                      min={1}
                      max={99}
                      step={1}
                      value={cuotaPorcentajePagado}
                      onChange={(e) => setCuotaPorcentajePagado(e.target.value)}
                      required
                    />
                  )}
                </div>
              )}

              {formCategoria === "FEDERACION" && (
                <div className="flex flex-col gap-1">
                  <Input
                    label="% para la escuela"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={cuotaEscuelaPorcentaje}
                    onChange={(e) => setCuotaEscuelaPorcentaje(e.target.value)}
                    required
                  />
                  {(() => {
                    const pct = Number(cuotaEscuelaPorcentaje);
                    const amt = Math.round(Number(formAmount));
                    if (!Number.isFinite(pct) || pct < 0 || pct > 100 || !Number.isFinite(amt) || amt <= 0) return null;
                    return (
                      <p className="text-xs text-muted-foreground">
                        Le queda a la escuela: {formatMoney(Math.round((amt * pct) / 100))} de {formatMoney(amt)}
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <>
              <Input label="Concepto" value={formConcepto} onChange={(e) => setFormConcepto(e.target.value)} required />
              <Input
                label="Monto"
                type="number"
                min={1}
                step={1}
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
              />
              <DatePicker label="Fecha" value={formDate} onChange={setFormDate} />
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
                <p className="flex items-center gap-1.5 truncate font-medium">
                  {m.concepto}
                  {m.locked && (
                    <span title="Recibo exportado: protegido contra borrado directo" className="shrink-0 text-muted-foreground">
                      <SidebarIcon name="lock" className="h-3.5 w-3.5" />
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateEs(m.date)} · {m.categoria}
                  {m.numero && ` · N.° ${m.numero}`}
                  {m.month && m.date.slice(0, 7) !== m.month && ` · Cuota de ${formatMonth(m.month)}`}
                  {m.porcentajePagado != null &&
                    ` · Pago parcial (${m.porcentajePagado}%)${m.pagoCompletado ? " · Completado" : ""}`}
                  {m.tipo === "INGRESO" &&
                    m.categoria === "FEDERACION" &&
                    (m.escuelaPorcentaje != null
                      ? ` · ${m.escuelaPorcentaje}% para la escuela (${formatMoney(Math.round((m.amount * m.escuelaPorcentaje) / 100))})`
                      : " · falta cargar el % para la escuela")}
                  {m.requestPending && " · Solicitud de borrado pendiente"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={m.tipo === "INGRESO" ? "text-success" : "text-danger"}>
                  {m.tipo === "INGRESO" ? "+" : "-"}
                  {formatMoney(m.amount)}
                </span>
                {m.porcentajePagado != null && !m.pagoCompletado && (
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                    Falta completar
                  </span>
                )}
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
                            onSelect: () => (m.locked ? abrirRecibo(m) : setReciboWarningTarget(m)),
                          },
                        ]
                      : []),
                    ...(m.tipo === "INGRESO" && m.categoria === "FEDERACION"
                      ? [{ label: "% para la escuela", onSelect: () => setPorcentajeTarget(m) }]
                      : []),
                    ...(m.source === "pago" && m.porcentajePagado != null && !m.pagoCompletado
                      ? [{ label: "Completar pago", onSelect: () => setCompletarTarget(m) }]
                      : []),
                    ...(m.source === "pago"
                      ? [{ label: "Desmarcar pago", onSelect: () => requestDelete(m), danger: true }]
                      : [
                          { label: "Editar", onSelect: () => openEdit(m) },
                          { label: "Eliminar", onSelect: () => requestDelete(m), danger: true },
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

      <ConfirmDialog
        open={reciboWarningTarget !== null}
        title="Exportar recibo"
        message={
          reciboWarningTarget
            ? `Una vez exportado el recibo de "${reciboWarningTarget.concepto}", este movimiento queda protegido: ya no se va a poder borrar directamente, solo pidiéndole el borrado al superadmin con una razón.`
            : undefined
        }
        confirmLabel="Exportar de todos modos"
        onConfirm={() => {
          if (reciboWarningTarget) abrirRecibo(reciboWarningTarget);
          setReciboWarningTarget(null);
        }}
        onCancel={() => setReciboWarningTarget(null)}
      />

      <SolicitarBorradoDialog
        open={solicitarTarget !== null}
        concepto={solicitarTarget?.concepto}
        onClose={() => setSolicitarTarget(null)}
        onSent={() => {
          setSolicitarTarget(null);
          loadMovimientos();
        }}
        onSubmit={handleSolicitarBorrado}
      />

      <PorcentajeFederacionDialog
        open={porcentajeTarget !== null}
        concepto={porcentajeTarget?.concepto}
        amount={porcentajeTarget?.amount}
        currentPorcentaje={porcentajeTarget?.escuelaPorcentaje}
        onClose={() => setPorcentajeTarget(null)}
        onSaved={() => {
          setPorcentajeTarget(null);
          loadMovimientos();
        }}
        onSubmit={handlePorcentajeSubmit}
      />

      <CompletarPagoDialog
        open={completarTarget !== null}
        concepto={completarTarget?.concepto}
        amount={completarTarget?.amount}
        porcentajePagado={completarTarget?.porcentajePagado}
        onClose={() => setCompletarTarget(null)}
        onSaved={() => {
          setCompletarTarget(null);
          loadMovimientos();
        }}
        onSubmit={handleCompletarSubmit}
      />
    </div>
  );
}
