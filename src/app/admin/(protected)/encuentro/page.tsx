import { EncuentroAdminClient } from "./EncuentroAdminClient";

export default function EncuentroAdminPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Fotos</h1>
        <p className="text-sm text-muted-foreground">
          Revisá y aprobá las fotos y videos que suba la gente, y compartí el link de la
          galería.
        </p>
      </div>
      <EncuentroAdminClient />
    </div>
  );
}
