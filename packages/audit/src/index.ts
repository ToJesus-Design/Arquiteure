import { prisma } from "@arquiteure/db";

export interface AuditInput {
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Regista evento append-only. Não atualiza nem apaga eventos existentes.
 * Garante a rastreabilidade exigida pelos PRINCÍPIOS DE FUNCIONAMENTO.
 */
export async function audit(input: AuditInput): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      actor: input.actor,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      beforeJson: (input.before as object) ?? undefined,
      afterJson: (input.after as object) ?? undefined,
    },
  });
}

/** Lê histórico cronológico de uma entidade. */
export async function history(entity: string, entityId: string) {
  return prisma.auditEvent.findMany({
    where: { entity, entityId },
    orderBy: { at: "asc" },
  });
}

/**
 * Cria nova ProjectVersion ligada à anterior. Versões são imutáveis;
 * mudanças sempre criam novo nó na DAG.
 */
export async function newVersion(opts: {
  projectId: string;
  parentId?: string;
  stage?: "CONCEPT" | "PRELIM" | "EXEC" | "SUBMISSION";
  snapshot: unknown;
  createdBy: string;
}) {
  const v = await prisma.projectVersion.create({
    data: {
      projectId: opts.projectId,
      parentId: opts.parentId,
      stage: opts.stage ?? "CONCEPT",
      snapshotJson: opts.snapshot as object,
      createdBy: opts.createdBy,
    },
  });
  await audit({
    actor: opts.createdBy,
    action: "VERSION_CREATED",
    entity: "ProjectVersion",
    entityId: v.id,
    after: { parentId: opts.parentId, stage: v.stage },
  });
  return v;
}
