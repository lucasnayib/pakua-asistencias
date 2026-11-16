import Image from "next/image";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { SchoolSearchBar } from "@/components/SchoolSearchBar";
import { DashboardPreview } from "@/components/marketing/DashboardPreview";
import { Card } from "@/components/ui/Card";
import { SidebarIcon, SidebarIconName } from "@/components/admin/SidebarIcon";

const SUPPORT_EMAIL = "pakuaasistencias@gmail.com";

/** Los tres módulos que más diferencian a Pakua de una planilla o un cuaderno — cada uno con
 * su propia sección "a lo DigitalDojo" (texto + lista de beneficios + panel chico), alternando
 * de lado. Todo lo que describen ya existe en el panel real, nada se inventa acá. */
const MAIN_MODULES: {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  photo: string;
  photoAlt: string;
}[] = [
  {
    eyebrow: "01",
    title: "Asistencia sin planillas",
    description:
      "Cada clase tiene su propia lista de alumnos con foto. Marcar presente es tocar la foto — nada de anotar en papel ni pasarlo a mano después.",
    bullets: [
      "Un toque por alumno, desde el celular o una tablet compartida",
      "Historial completo, clase por clase, siempre disponible",
      "Corrección de registros anteriores con los permisos correspondientes",
      "Funciona igual de bien en el celular que en la computadora",
    ],
    photo: "/images/hero-sparring.jpg",
    photoAlt: "Alumnos entrenando combate en Pakua",
  },
  {
    eyebrow: "02",
    title: "Alumnos, horarios y orientadores en un solo lugar",
    description:
      "La ficha de cada alumno reúne sus datos, graduación, asistencias y pagos. Los horarios se arman con sus días y franjas, y cada orientador queda asignado a las clases que le corresponden.",
    bullets: [
      "Ficha completa por alumno, con foto e historial de graduaciones",
      "Horarios con días, franjas y orientador a cargo",
      "Asignaciones claras: quién da cada clase",
      "Baja automática de alumnos inactivos, configurable por escuela",
    ],
    photo: "/images/dojo-trio.jpg",
    photoAlt: "Alumnos de Pakua en el dojo",
  },
  {
    eyebrow: "03",
    title: "Cuotas, pagos y recibos",
    description:
      "Cada tipo de cuota o actividad tiene su propio precio. El sistema sabe quién pagó este mes y quién no, y genera un recibo con los datos de la escuela cuando hace falta.",
    bullets: [
      "Alertas de cuotas pendientes, sin tener que ir a buscarlas",
      "Recibo descargable por cada pago, listo para entregar",
      "Resumen mensual de ingresos y gastos",
      "Categorías propias para actividades, federación u otros conceptos",
    ],
    photo: "/images/dojo-duo-espada.jpg",
    photoAlt: "Alumnos de Pakua practicando con armas de corte",
  },
];

/** Funcionalidades secundarias: una sola grilla, sin el detalle de los módulos principales de
 * arriba — mismo criterio que pide el documento de referencia para no amontonar todo en una
 * sola sección. */
const SECONDARY_FEATURES: { title: string; description: string; icon: SidebarIconName }[] = [
  {
    title: "Graduaciones",
    description: "Historial de cinturones por alumno, con fecha de evaluación y entrega.",
    icon: "compass",
  },
  {
    title: "Estadísticas",
    description: "Panorama de la escuela: alumnos activos, asistencia y evolución en el tiempo.",
    icon: "bar-chart",
  },
  {
    title: "Exportaciones",
    description: "Asistencias, alumnos y movimientos financieros a Excel, cuando los necesites.",
    icon: "download",
  },
  {
    title: "Orientadores",
    description: "Ficha propia para cada instructor, con las clases y alumnos a su cargo.",
    icon: "user-check",
  },
];

export default function HomePage() {
  const priceArs =
    process.env.SUBSCRIPTIONS_ENABLED === "true" ? (process.env.SUBSCRIPTION_PRICE_ARS ?? null) : null;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-dot-grid">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-24 px-4 py-12 sm:gap-28">
        {/* --- Hero: la propuesta de valor a la izquierda, el software de verdad a la derecha --- */}
        <section className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-8">
          <div className="flex flex-col items-center gap-5 text-center md:items-start md:text-left">
            <span className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              Pakua Asistencias
            </span>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              La gestión de tu escuela de artes marciales, sin planillas
            </h1>
            <p className="max-w-md text-balance text-muted-foreground">
              Alumnos, horarios, asistencia y cuotas en un solo panel. Pensado para que tu
              escuela se maneje desde el celular, sin depender de papeles ni de Excel sueltos.
            </p>

            <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-2 p-5">
              <SchoolSearchBar />
              <p className="mt-3 text-center text-sm text-muted-foreground md:text-left">
                ¿Todavía no usás Pakua?{" "}
                <Link href="/admin/login?mode=register" className="text-accent hover:underline">
                  Registrá tu escuela gratis
                </Link>
              </p>
            </div>
          </div>

          <DashboardPreview />
        </section>

        {/* --- Los tres módulos principales, alternando texto/panel de un lado al otro --- */}
        <div className="flex flex-col gap-20">
          {MAIN_MODULES.map((module, i) => (
            <section
              key={module.title}
              className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12"
            >
              <div className={`flex flex-col gap-4 ${i % 2 === 1 ? "md:order-2" : ""}`}>
                <span className="text-sm font-semibold text-accent">{module.eyebrow}</span>
                <h2 className="text-2xl font-semibold tracking-tight">{module.title}</h2>
                <p className="text-muted-foreground">{module.description}</p>
                <ul className="flex flex-col gap-2.5">
                  {module.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className={`relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-surface-2 ${
                  i % 2 === 1 ? "md:order-1" : ""
                }`}
              >
                <Image
                  src={module.photo}
                  alt={module.photoAlt}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            </section>
          ))}
        </div>

        {/* --- Funcionalidades secundarias, en grilla --- */}
        <section className="flex flex-col gap-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Y todo lo demás que ya necesitás</h2>
            <p className="mt-2 text-muted-foreground">Sin agregar una herramienta más a la pila.</p>
          </div>
          <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SECONDARY_FEATURES.map((f) => (
              <Card key={f.title} className="flex flex-col gap-3 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <SidebarIcon name={f.icon} className="h-5 w-5" />
                </span>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* --- Confianza: todavía no hay testimonios reales que mostrar, así que en su lugar
            se explica cómo se cuidan los datos de cada escuela --- */}
        <section className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-12">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-surface-2">
            <Image
              src="/images/team-banner.jpg"
              alt="Equipo de instructores de Pakua Federación Mundial"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Pensado para cuidar los datos de tu escuela</h2>
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <SidebarIcon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>Las contraseñas nunca se guardan en texto plano, y cada escuela solo ve sus propios datos.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <SidebarIcon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>Los cambios importantes quedan en un registro de auditoría, no se pierden.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <SidebarIcon name="database" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>Copias de seguridad periódicas de toda la información cargada.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* --- Precios: misma composición de dos columnas que la referencia (texto + pasos a
            la izquierda, tarjeta de precio a la derecha), pero con el plan real — sin
            descuentos, prueba gratis ni condiciones que no existan. --- */}
        {priceArs && (
          <section className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-14">
            <div className="flex flex-col gap-6">
              <span className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Precio</span>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                ${priceArs}/mes.
                <br />
                Alumnos y orientadores sin límite.
              </h2>
              <p className="max-w-md text-muted-foreground">
                Un único plan con todas las funciones incluidas, para cualquier tamaño de escuela.
                Para empezar con orden y seguir creciendo.
              </p>
              <ol className="flex flex-col gap-4">
                {[
                  "Registrás tu escuela en un par de minutos.",
                  "Cargás tus alumnos a mano o los importás desde Excel.",
                  "Pasás asistencia y cobrás cuotas desde el celular.",
                ].map((step, i) => (
                  <li key={step} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <Card className="flex w-full flex-col gap-5 p-8">
              <div>
                <p className="text-4xl font-semibold">
                  ${priceArs}
                  <span className="text-base font-normal text-muted-foreground"> / mes</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Alumnos y orientadores sin límite</p>
              </div>

              <div className="border-t border-border" />

              <ul className="flex flex-col gap-3 text-sm">
                {[
                  "Alumnos, clases y horarios",
                  "Asistencia digital desde el celular",
                  "Cuotas, pagos y recibos",
                  "Graduaciones e historial de cada alumno",
                  "Importación de alumnos desde Excel",
                  "Exportaciones a Excel",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-accent">
                      <path
                        d="M4 10.5 8 14l8-8"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/admin/login?mode=register"
                className="rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-foreground transition hover:brightness-110"
              >
                Registrar mi escuela
              </Link>
              <p className="text-center text-xs text-muted-foreground">
                Pago mensual automático vía Mercado Pago · cancelás cuando quieras
              </p>
            </Card>
          </section>
        )}

        {/* --- Cierre --- */}
        <section className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">¿Listo para dejar las planillas?</h2>
          <p className="max-w-md text-muted-foreground">
            Registrá tu escuela y empezá a usar Pakua hoy mismo.
          </p>
          <Link
            href="/admin/login?mode=register"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:brightness-110"
          >
            Registrar mi escuela
          </Link>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground">
        <p>
          ¿Necesitás ayuda?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </footer>
    </div>
  );
}
