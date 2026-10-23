import { prisma } from "@/lib/prisma";
import { currentMonth } from "@/lib/aranceles-calc";

export type MovimientoRow = {
  id: string;
  tipo: "INGRESO" | "EGRESO";
  categoria: string;
  concepto: string;
  amount: number;
  date: string;
  estado: "PAGADO" | "NO_PAGADO";
  source: "movimiento" | "pago";
  studentId?: string;
  alumnoArancelId?: string | null;
  month?: string;
  numero: string;
};

/** Mezcla los MovimientoFinanciero sueltos con las cuotas pagadas por alumno (PagoArancel),
 * vistas como filas de solo-lectura con el mismo formato ("Cuota (Tipo), Apellido Nombre") —
 * usado tanto por el listado de la pestaña Gastos e ingresos como por la exportación a Excel,
 * para no mantener la misma lógica de combinación en dos lugares. */
export async function getMovimientosList(
  adminId: string,
  filters: { month?: string | null; tipo?: string | null } = {}
): Promise<MovimientoRow[]> {
  const { month, tipo } = filters;

  const movimientos = await prisma.movimientoFinanciero.findMany({
    where: {
      adminId,
      ...(month ? { date: { startsWith: month } } : {}),
      ...(tipo ? { tipo } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const pagos = tipo === "EGRESO"
    ? []
    : await prisma.pagoArancel.findMany({
        where: { adminId, ...(month ? { month } : {}) },
        include: {
          student: { select: { firstName: true, lastName: true } },
          tipoArancel: { select: { name: true } },
        },
        orderBy: { paidAt: "desc" },
      });

  const enrollments = pagos.length
    ? await prisma.alumnoArancel.findMany({
        where: {
          studentId: { in: pagos.map((p) => p.studentId) },
          tipoArancelId: { in: pagos.map((p) => p.tipoArancelId) },
        },
        select: { id: true, studentId: true, tipoArancelId: true },
      })
    : [];
  const enrollmentMap = new Map(enrollments.map((e) => [`${e.studentId}:${e.tipoArancelId}`, e.id]));

  const pagoRows: MovimientoRow[] = pagos.map((p) => ({
    id: `pago:${p.id}`,
    tipo: "INGRESO",
    categoria: "CUOTAS",
    concepto: `Cuota (${p.tipoArancel.name}), ${p.student.lastName} ${p.student.firstName}`,
    amount: p.amount,
    date: p.paidAt.toISOString().slice(0, 10),
    estado: "PAGADO",
    source: "pago",
    studentId: p.studentId,
    alumnoArancelId: enrollmentMap.get(`${p.studentId}:${p.tipoArancelId}`) ?? null,
    month: p.month,
    // Mismo cálculo que /api/aranceles/movimientos/recibo, para que el número que aparece
    // impreso en el recibo sea el mismo que se puede buscar/exportar.
    numero: p.id.slice(-8).toUpperCase(),
  }));

  const movimientoRows: MovimientoRow[] = movimientos.map((m) => ({
    ...m,
    tipo: m.tipo as "INGRESO" | "EGRESO",
    estado: m.estado as "PAGADO" | "NO_PAGADO",
    source: "movimiento",
    numero: m.id.slice(-8).toUpperCase(),
  }));

  return [...movimientoRows, ...pagoRows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Alumnos (de una escuela) con al menos un arancel activo sin pagar en el mes dado, y cuáles.
 * "Sin pagar" = no existe PagoArancel para ese (alumno, tipo, mes) — ver nota de diseño en el
 * plan: nunca se precrean filas "pendientes", la ausencia de fila ya lo es. */
export async function getPendingAranceles(adminId: string, month: string) {
  const enrollments = await prisma.alumnoArancel.findMany({
    where: {
      active: true,
      startMonth: { lte: month },
      student: { adminId, active: true },
      tipoArancel: { active: true },
    },
    include: { student: { select: { id: true, firstName: true, lastName: true } }, tipoArancel: true },
  });
  if (enrollments.length === 0) return [];

  const paid = await prisma.pagoArancel.findMany({
    where: { adminId, month, tipoArancelId: { in: enrollments.map((e) => e.tipoArancelId) } },
    select: { studentId: true, tipoArancelId: true },
  });
  const paidKeys = new Set(paid.map((p) => `${p.studentId}:${p.tipoArancelId}`));

  const byStudent = new Map<string, { studentId: string; studentName: string; tiposPendientes: string[] }>();
  for (const e of enrollments) {
    if (paidKeys.has(`${e.studentId}:${e.tipoArancelId}`)) continue;
    const entry = byStudent.get(e.studentId) ?? {
      studentId: e.studentId,
      studentName: `${e.student.lastName}, ${e.student.firstName}`,
      tiposPendientes: [],
    };
    entry.tiposPendientes.push(e.tipoArancel.name);
    byStudent.set(e.studentId, entry);
  }
  return Array.from(byStudent.values());
}

/** Cantidad de alumnos (no de pagos sueltos) con algo pendiente este mes — lo que se muestra
 * en el badge del sidebar. */
export async function countStudentsWithUnpaidAranceles(adminId: string, month: string): Promise<number> {
  const pending = await getPendingAranceles(adminId, month);
  return pending.length;
}

async function enrollIfNeeded(studentId: string, tipoArancelId: string): Promise<void> {
  const existing = await prisma.alumnoArancel.findUnique({
    where: { studentId_tipoArancelId: { studentId, tipoArancelId } },
  });
  if (existing?.active) return;
  if (existing) {
    await prisma.alumnoArancel.update({ where: { id: existing.id }, data: { active: true, startMonth: currentMonth() } });
  } else {
    await prisma.alumnoArancel.create({ data: { studentId, tipoArancelId, startMonth: currentMonth() } });
  }
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Automatización: si la "formación" del alumno (Arte Marcial, Taichi, Yoga, Armas de Corte,
 * etc. — el mismo campo que ya se carga en su ficha) coincide con el NOMBRE de un tipo de
 * arancel activo de la escuela, lo anota solo a ese arancel, sin que el admin tenga que
 * hacerlo a mano. La comparación ignora mayúsculas/minúsculas y espacios de más, para que no
 * dependa de cómo se haya tipeado cada uno. No desanota de nada si la formación cambia — es
 * intencional, para no sacar algo que el admin haya anotado manualmente por otro motivo (ver
 * plan de Aranceles). */
export async function autoEnrollByFormacion(studentId: string, adminId: string, formacion: string | null | undefined): Promise<void> {
  if (!formacion) return;
  const tipos = await prisma.tipoArancel.findMany({ where: { adminId, active: true } });
  const tipo = tipos.find((t) => sameName(t.name, formacion));
  if (!tipo) return;
  await enrollIfNeeded(studentId, tipo.id);
}

/** La otra dirección de la misma automatización: cuando se crea (o se reactiva/renombra) un
 * tipo de arancel cuyo nombre coincide con la "formación" de alumnos ya existentes, los anota
 * a todos de una, sin esperar a que alguien edite cada ficha. */
export async function autoEnrollStudentsForTipo(adminId: string, tipoArancelId: string, tipoName: string): Promise<void> {
  const students = await prisma.student.findMany({
    where: { adminId, active: true, NOT: { formacion: null } },
    select: { id: true, formacion: true },
  });
  for (const s of students) {
    if (s.formacion && sameName(s.formacion, tipoName)) {
      await enrollIfNeeded(s.id, tipoArancelId);
    }
  }
}
