import Image from "next/image";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { SchoolSearchBar } from "@/components/SchoolSearchBar";
import { Card } from "@/components/ui/Card";

const SUPPORT_EMAIL = "pakuaasistencias@gmail.com";

const FEATURES = [
  {
    title: "Asistencia en segundos",
    description:
      "Tus alumnos marcan presente desde el celular con un par de toques, sin filas, sin planillas de papel y sin depender de que alguien las pase a mano después.",
  },
  {
    title: "Horarios y orientadores",
    description:
      "Organizá cada clase con sus días y horarios, y asigná qué orientador está a cargo de cada grupo. Todo ordenado en un solo lugar, fácil de actualizar cuando cambia algo.",
  },
  {
    title: "Reportes al instante",
    description:
      "Exportá las asistencias a Excel cuando las necesites, filtradas por fecha o por clase, listas para compartir o analizar sin armar nada a mano.",
  },
];

/** Marco decorativo para las fotos ilustrativas: mismo aro/borde en acento que el resto del diseño. */
function HeroPhoto({
  src,
  alt,
  aspect,
  sizes,
  className = "",
}: {
  src: string;
  alt: string;
  aspect: string;
  sizes: string;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-accent/20 bg-surface-2 ${aspect} ${className}`}
    >
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-accent/10" />
    </div>
  );
}

/** Motivo decorativo Bagua (八卦): círculo con los 8 trigramas simplificados, muy tenue, solo de fondo. */
function BaguaMotif({ className = "" }: { className?: string }) {
  const trigrams = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true">
      <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="110" fill="none" stroke="currentColor" strokeWidth="1" />
      {trigrams.map((angle) => (
        <g key={angle} transform={`rotate(${angle} 200 200)`}>
          {[0, 1, 2].map((line) => (
            <rect
              key={line}
              x={192}
              y={54 + line * 14}
              width={16}
              height={7}
              fill="currentColor"
              opacity={line === 1 && angle % 90 === 45 ? 0 : 1}
            />
          ))}
        </g>
      ))}
      <circle cx="200" cy="200" r="4" fill="currentColor" />
    </svg>
  );
}

const LEFT_TRIGRAMS = ["乾", "兌", "離", "震"];
const RIGHT_TRIGRAMS = ["巽", "坎", "艮", "坤"];

/** Tamaño de los trigramas laterales: ~70% del margen lateral que deja el contenido
 * (max-w-4xl = 56rem), acotado entre un piso y un techo para que no se rompa en
 * pantallas muy angostas o ultra anchas. */
const TRIGRAM_SIZE = "clamp(2.2rem, calc(35vw - 19.6rem), 13rem)";

/** Centro del margen lateral (entre el borde de la pantalla y el contenido central). */
const TRIGRAM_OFFSET = "calc(25vw - 14rem)";

function TrigramRail({ chars, side }: { chars: string[]; side: "left" | "right" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 flex-col items-center gap-4 leading-none text-foreground/15 select-none xl:flex ${
        side === "left" ? "-translate-x-1/2" : "translate-x-1/2"
      }`}
      style={{
        fontSize: TRIGRAM_SIZE,
        [side]: TRIGRAM_OFFSET,
      }}
    >
      {chars.map((char, i) => (
        <span
          key={char}
          style={{ animation: `trigram-drift 7s ease-in-out ${i * 0.6}s infinite` }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <TrigramRail chars={LEFT_TRIGRAMS} side="left" />
      <TrigramRail chars={RIGHT_TRIGRAMS} side="right" />

      <AppHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-16 px-4 py-12">
        <section className="relative grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          <BaguaMotif className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] text-accent/[0.07] md:-right-32" />

          <div className="relative flex flex-col items-center gap-5 text-center md:items-start md:text-left">
            <div className="flex flex-col items-center gap-3 md:items-start">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Registrá la asistencia de tu escuela de forma más cómoda
              </h1>
              <p className="max-w-md text-balance text-muted-foreground">
                Sumate a Pakua Asistencias: control de alumnos, horarios y clases desde el celular
                o la compu, sin planillas ni complicaciones.
              </p>
            </div>

            <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-2 p-5">
              <SchoolSearchBar />
              <p className="mt-3 text-center text-sm text-muted-foreground md:text-left">
                ¿Todavía no usás Pakua?{" "}
                <Link href="/registrar-escuela" className="text-accent hover:underline">
                  Registrá tu escuela gratis
                </Link>
              </p>
            </div>
          </div>
          <HeroPhoto
            src="/images/hero-sparring.jpg"
            alt="Alumnos entrenando combate en Pakua"
            aspect="aspect-[16/9]"
            sizes="(min-width: 768px) 50vw, 100vw"
          />
        </section>

        <HeroPhoto
          src="/images/team-banner.jpg"
          alt="Equipo de instructores de Pakua Federación Mundial"
          aspect="aspect-[2.15/1]"
          sizes="100vw"
        />

        <section className="flex flex-col gap-8">
          <div className="flex items-center justify-center gap-3 text-accent/50">
            <span className="h-px w-16 bg-current" />
            <span className="text-xs tracking-[0.3em] uppercase">道</span>
            <span className="h-px w-16 bg-current" />
          </div>

          <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="flex flex-col gap-2 border-t-2 border-t-accent p-6">
                <h2 className="text-lg font-semibold">{f.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </Card>
            ))}
          </div>
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
