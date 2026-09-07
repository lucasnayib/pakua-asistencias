import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isItineranciasOpen, isItineranciasSchool } from "@/lib/itinerancias";
import { getUnlockedItineranciaAdminId } from "@/lib/itinerancia-access";
import { ItineranciaUnlockGate } from "@/components/attendance/ItineranciaUnlockGate";
import { ItineranciasClient } from "@/components/attendance/ItineranciasClient";
import { AppHeader } from "@/components/layout/AppHeader";

type Params = { params: Promise<{ slug: string }> };

export default async function ItineranciasPage({ params }: Params) {
  const { slug } = await params;

  // Igual que las demás escuelas: no revela que la sección existe si no es la habilitada.
  if (!isItineranciasSchool(slug)) {
    notFound();
  }

  const school = await prisma.admin.findFirst({
    where: { slug, active: true, role: "ADMIN" },
    select: { id: true, displayName: true },
  });
  if (!school) {
    notFound();
  }

  if (!isItineranciasOpen()) {
    return (
      <>
        <AppHeader />
        <main className="flex min-h-[60vh] flex-col items-center justify-center gap-2 p-8 text-center">
          <h1 className="text-xl font-semibold">Itinerancias — {school.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            No hay itinerancia abierta este mes. Las próximas son en marzo, junio, septiembre y
            diciembre.
          </p>
        </main>
      </>
    );
  }

  const unlockedAdminId = await getUnlockedItineranciaAdminId(slug);
  if (unlockedAdminId !== school.id) {
    return <ItineranciaUnlockGate slug={slug} schoolName={school.displayName} />;
  }

  return <ItineranciasClient adminId={school.id} />;
}
