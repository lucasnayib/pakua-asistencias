import { prisma } from "@/lib/prisma";

type LogChangeInput = {
  actor: string;
  action: string;
  entity: string;
  entityId?: string;
  detail?: string;
};

/** Registra un cambio en el log de auditoría. No lanza si falla: nunca debe romper la operación principal. */
export async function logChange(input: LogChangeInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actor: input.actor,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        detail: input.detail,
      },
    });
  } catch (error) {
    console.warn("[audit] no se pudo registrar el log:", error);
  }
}
