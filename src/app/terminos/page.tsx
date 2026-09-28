import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de uso de la plataforma Pakua Asistencias para escuelas, administradores y alumnos.",
};

export default function TerminosPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Términos y condiciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">Última actualización: septiembre de 2026</p>
      </div>

      <div className="flex flex-col gap-5 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-base font-semibold">1. Aceptación</h2>
          <p className="mt-1 text-muted-foreground">
            Al registrar una escuela o usar Pakua Asistencias (attendio.lat) como administrador,
            orientador o alumno, aceptás estos términos y la{" "}
            <Link href="/privacidad" className="text-accent hover:underline">
              Política de privacidad
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">2. Qué es el servicio</h2>
          <p className="mt-1 text-muted-foreground">
            Pakua Asistencias es una plataforma de gestión de asistencia para escuelas de artes
            marciales: registro de clases, horarios, alumnos, orientadores y reportes asociados.
            Cada escuela administra su propio panel de forma independiente.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">3. Cuentas y responsabilidad de la escuela</h2>
          <p className="mt-1 text-muted-foreground">
            La escuela es responsable de la veracidad de los datos que carga (alumnos,
            orientadores, horarios) y de mantener la confidencialidad de sus credenciales de
            acceso. Es responsable, además, de contar con el consentimiento correspondiente de sus
            alumnos (o de sus tutores, si son menores de edad) para el tratamiento de sus datos en
            la plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">4. Suscripción y pagos</h2>
          <p className="mt-1 text-muted-foreground">
            Si la escuela contrata un plan pago, el cobro se procesa a través de Mercado Pago de
            forma recurrente. En caso de que falle un cobro, se otorga un período de gracia antes
            de suspender el acceso al panel. Los precios y condiciones vigentes se muestran al
            momento de la contratación.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">5. Uso aceptable</h2>
          <p className="mt-1 text-muted-foreground">
            No está permitido usar la plataforma para cargar datos de personas sin autorización,
            intentar vulnerar la seguridad del sistema, ni usar el servicio con fines distintos a
            la gestión de asistencia de una escuela real.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">6. Disponibilidad del servicio</h2>
          <p className="mt-1 text-muted-foreground">
            Hacemos un esfuerzo razonable para mantener el servicio disponible, pero no
            garantizamos disponibilidad ininterrumpida. Podemos realizar tareas de mantenimiento
            que impliquen interrupciones breves, e intentaremos avisar con anticipación cuando sea
            posible.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">7. Baja del servicio</h2>
          <p className="mt-1 text-muted-foreground">
            La escuela puede solicitar la baja de su cuenta en cualquier momento escribiendo a{" "}
            <a href="mailto:pakuaasistencias@gmail.com" className="text-accent hover:underline">
              pakuaasistencias@gmail.com
            </a>
            . Nos reservamos el derecho de suspender cuentas que incumplan estos términos.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">8. Cambios a estos términos</h2>
          <p className="mt-1 text-muted-foreground">
            Podemos actualizar estos términos para reflejar cambios en el servicio. La fecha de la
            última actualización figura al principio de esta página.
          </p>
        </section>
      </div>

      <Link href="/" className="text-sm font-medium text-accent hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
