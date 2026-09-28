import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
      <p>
        <Link href="/privacidad" className="hover:underline">
          Política de privacidad
        </Link>
        {" · "}
        <Link href="/terminos" className="hover:underline">
          Términos y condiciones
        </Link>
      </p>
    </footer>
  );
}
