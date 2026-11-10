import { redirect } from "next/navigation";

// El registro dejó de ser una página aparte: ahora es el modo "register" de la misma tarjeta
// animada de /admin/login (ver src/components/auth/AuthCard.tsx). Se deja este redirect por si
// alguien tenía el enlace viejo guardado o compartido.
export default function RegistrarEscuelaPage() {
  redirect("/admin/login?mode=register");
}
