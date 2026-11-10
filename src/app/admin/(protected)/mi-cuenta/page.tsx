import { redirect } from "next/navigation";

// "Mi cuenta" dejó de ser una página aparte: ahora es un modal (AccountDialog) que se abre
// tocando el propio usuario en el sidebar, desde cualquier pantalla del panel. Esta ruta se
// deja como redirect por si alguien tenía el enlace guardado.
export default function MiCuentaPage() {
  redirect("/admin");
}
