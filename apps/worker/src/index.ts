import cron from "node-cron";
import { runUpdateCycle } from "@arquiteure/updater";
import { loadPortugueseRules } from "@arquiteure/knowledge";
import { audit } from "@arquiteure/audit";

async function main() {
  console.log("[worker] Arquiteure worker a arrancar.");

  // Carrega/atualiza regras PT ao arranque (idempotente).
  const load = await loadPortugueseRules();
  console.log(`[worker] Regras PT carregadas: ${load.inserted} novas, ${load.updated} atualizadas.`);

  const schedule = process.env.KNOWLEDGE_UPDATE_CRON ?? "0 4 * * *";
  console.log(`[worker] Ciclo de atualização agendado: ${schedule}`);

  cron.schedule(schedule, async () => {
    console.log("[worker] A iniciar ciclo de atualização.");
    try {
      const r = await runUpdateCycle();
      console.log(`[worker] Ciclo OK. Regras verificadas=${r.checked}, alterações=${r.changes}`);
      await audit({
        actor: "system:worker",
        action: "UPDATE_CYCLE_COMPLETED",
        entity: "system",
        entityId: "updater",
        after: r,
      });
    } catch (err) {
      console.error("[worker] Ciclo falhou:", err);
      await audit({
        actor: "system:worker",
        action: "UPDATE_CYCLE_FAILED",
        entity: "system",
        entityId: "updater",
        after: { error: String(err) },
      });
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
