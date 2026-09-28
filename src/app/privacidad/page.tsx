import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad — Pakua Asistencias",
  description: "Cómo Pakua Asistencias recolecta, usa y protege los datos personales de alumnos, orientadores y escuelas.",
};

export default function PrivacidadPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Política de privacidad</h1>
        <p className="mt-1 text-sm text-muted-foreground">Última actualización: septiembre de 2026</p>
      </div>

      <div className="flex flex-col gap-5 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-base font-semibold">1. Responsable del tratamiento</h2>
          <p className="mt-1 text-muted-foreground">
            El responsable del tratamiento de los datos personales recolectados a través de este
            sitio (attendio.lat) es [NOMBRE], contactable en{" "}
            <a href="mailto:pakuaasistencias@gmail.com" className="text-accent hover:underline">
              pakuaasistencias@gmail.com
            </a>
            . Esta política se rige por la Ley 25.326 de Protección de Datos Personales de la
            República Argentina.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">2. Qué datos recolectamos</h2>
          <p className="mt-1 text-muted-foreground">
            Según quién use la plataforma, podemos recolectar: nombre y apellido, DNI, fecha de
            nacimiento, foto de perfil, email y teléfono de contacto, graduación/cinto, y
            registros de asistencia (fecha, hora y, si el establecimiento lo requiere, ubicación
            geográfica aproximada al momento de marcar presente). Los datos de alumnos son
            cargados por la escuela que administra el panel, no directamente por el sitio a
            terceros.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">3. Para qué los usamos</h2>
          <p className="mt-1 text-muted-foreground">
            Usamos estos datos exclusivamente para el funcionamiento del servicio: llevar el
            registro de asistencia de cada escuela, generar reportes y planillas para sus
            administradores, gestionar la cuenta de la escuela (incluida la facturación de la
            suscripción, si corresponde) y enviar notificaciones operativas por email (ej.
            confirmaciones, recuperación de contraseña, avisos de baja por inactividad).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">4. Con quién compartimos datos</h2>
          <p className="mt-1 text-muted-foreground">
            No vendemos ni cedemos datos personales a terceros con fines comerciales. Solo se
            comparten datos con proveedores necesarios para operar el servicio (ej. envío de
            emails transaccionales, procesamiento de pagos de la suscripción), quienes acceden
            únicamente a lo estrictamente necesario para prestar ese servicio.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">5. Cookies</h2>
          <p className="mt-1 text-muted-foreground">
            Usamos cookies técnicas indispensables (ej. la sesión de administrador) que no
            requieren consentimiento previo por ser estrictamente necesarias. Si en algún momento
            incorporamos cookies de análisis, solo se activan si aceptás el banner de cookies del
            sitio, y podés rechazarlas sin que eso afecte el funcionamiento básico de la
            plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">6. Tus derechos (ARCO)</h2>
          <p className="mt-1 text-muted-foreground">
            Como titular de tus datos, tenés derecho de acceso, rectificación, actualización y
            supresión de tu información, de acuerdo a la Ley 25.326. Para ejercerlos, escribinos a{" "}
            <a href="mailto:[EMAIL]" className="text-accent hover:underline">
              [EMAIL]
            </a>{" "}
            indicando tu nombre, la escuela a la que pertenecés y el dato que querés
            corregir o eliminar. La Agencia de Acceso a la Información Pública, en su carácter de
            Órgano de Control de la Ley 25.326, tiene la atribución de atender denuncias y
            reclamos que interpongan quienes resulten afectados en sus derechos.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">7. Conservación y baja de datos</h2>
          <p className="mt-1 text-muted-foreground">
            Los datos se conservan mientras la escuela mantenga la cuenta activa. Si un alumno es
            dado de baja, sus datos dejan de mostrarse en las clases activas pero se conservan
            como historial salvo que se solicite su eliminación definitiva, cuando el sistema lo
            permita (ej. sin registros de asistencia asociados).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold">8. Cambios a esta política</h2>
          <p className="mt-1 text-muted-foreground">
            Podemos actualizar esta política para reflejar cambios en el servicio o en la
            normativa aplicable. La fecha de la última actualización figura al principio de esta
            página.
          </p>
        </section>
      </div>

      <Link href="/" className="text-sm font-medium text-accent hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
