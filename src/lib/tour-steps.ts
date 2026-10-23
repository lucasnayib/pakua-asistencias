// Datos puros (sin JSX) de la guía interactiva: un solo recorrido continuo que lleva al
// admin por Alumnos -> Horarios -> Aranceles, señalando en cada paso el botón real a apretar.
// Cada `target` es un selector sobre un atributo `data-tour="..."` agregado a mano en el
// elemento real (nunca texto/clase, que puede cambiar) — ver AdminSidebar.tsx,
// alumnos/page.tsx, horarios/page.tsx, aranceles/page.tsx y MovimientosTab.tsx.

export type TourStep = {
  id: string;
  route: string;
  target: string;
  title: string;
  body: string;
  placement: "top" | "bottom" | "left" | "right";
  /** Si el target vive dentro de un grupo colapsable del sidebar, qué grupo forzar a abrir. */
  openGroup?: string;
  /** El target vive en el sidebar — en mobile el sidebar es un menú hamburguesa cerrado por
   * defecto (queda trasladado fuera de pantalla, no oculto por CSS), así que hay que pedirle
   * que se abra antes de buscar el elemento. */
  inSidebar?: boolean;
  /** El target vive dentro de un <dialog> con su propio ::backdrop — el spotlight no dibuja
   * una segunda capa de oscurecido encima, solo el contorno. */
  insideDialog?: boolean;
  /** El target de ESTE paso revela el target del paso siguiente (una pestaña que hay que
   * cambiar, un botón que abre un modal) — "Siguiente" hace el click real por el usuario,
   * porque solo avanzar el número de paso no alcanza: el elemento del paso de después todavía
   * no existe en el DOM hasta que ese click realmente pasa. */
  autoClick?: boolean;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "nav-alumnos",
    route: "/admin",
    target: "[data-tour='nav-alumnos']",
    title: "Alumnos",
    body: "Acá vas a dar de alta, editar y gestionar a tus alumnos. Hacé click para entrar.",
    placement: "right",
    openGroup: "gestion",
    inSidebar: true,
  },
  {
    id: "btn-nuevo-alumno",
    route: "/admin/alumnos",
    target: "[data-tour='btn-nuevo-alumno']",
    title: "Alta de alumno",
    body: "Tocá este botón para registrar un alumno nuevo: nombre, formación, foto y datos de contacto.",
    placement: "bottom",
  },
  {
    id: "nav-horarios",
    route: "/admin/alumnos",
    target: "[data-tour='nav-horarios']",
    title: "Horarios",
    body: "Ahora vamos a Horarios, donde se crean las clases y franjas en las que tus alumnos asisten.",
    placement: "right",
    openGroup: "gestion",
    inSidebar: true,
  },
  {
    id: "btn-nuevo-horario",
    route: "/admin/horarios",
    target: "[data-tour='btn-nuevo-horario']",
    title: "Nuevo horario",
    body: "Tocá acá para crear un horario: día, hora y actividad.",
    placement: "bottom",
  },
  {
    id: "nav-asignaciones",
    route: "/admin/horarios",
    target: "[data-tour='nav-asignaciones']",
    title: "Asignaciones",
    body: "Ya creaste el horario — ahora hay que anotar qué alumnos lo cursan. Eso se hace acá, en Asignaciones.",
    placement: "right",
    openGroup: "gestion",
    inSidebar: true,
  },
  {
    id: "select-horario-asignacion",
    route: "/admin/asignaciones",
    target: "[data-tour='select-horario-asignacion']",
    title: "Asignar alumnos",
    body: "Elegí el horario acá arriba y tildá, de la lista, qué alumnos lo cursan. Así quedan anotados para marcar asistencia en esa clase.",
    placement: "bottom",
  },
  {
    id: "nav-aranceles",
    route: "/admin/asignaciones",
    target: "[data-tour='nav-aranceles']",
    title: "Aranceles",
    body: "Por último, Aranceles: ahí llevás las finanzas de la escuela y el pago de cuotas de los alumnos.",
    placement: "right",
    inSidebar: true,
  },
  {
    id: "tab-movimientos",
    route: "/admin/aranceles",
    target: "[data-tour='tab-movimientos']",
    title: "Gastos e ingresos",
    body: "Esta pestaña es el libro de movimientos: todos los gastos de la escuela y los ingresos, incluidas las cuotas.",
    placement: "bottom",
    autoClick: true,
  },
  {
    id: "btn-nuevo-movimiento",
    route: "/admin/aranceles",
    target: "[data-tour='btn-nuevo-movimiento']",
    title: "Nuevo movimiento",
    body: "Tocá acá para registrar un gasto o un ingreso — incluyendo el pago de la cuota de un alumno. Se abre un formulario donde cargás el tipo, el monto y la fecha.",
    placement: "bottom",
  },
  {
    id: "nav-asistencia",
    route: "/admin/aranceles",
    target: "[data-tour='nav-asistencia']",
    title: "Toma de asistencia",
    body: "Por último: este botón te lleva a la pantalla pública donde tus alumnos marcan su asistencia en cada clase — es la pantalla pensada para quedar en el salón, no para administrar, así que te cierra la sesión del panel al entrar ahí (después volvés a entrar con tu usuario como siempre). Para desbloquearla pide la MISMA contraseña de tu cuenta de admin. Por eso: nunca se la compartas a los alumnos — que esa contraseña la conozcan solo vos y tus orientadores/instructores. ¡Con esto ya conocés lo básico de Pakua!",
    placement: "right",
    inSidebar: true,
  },
];
