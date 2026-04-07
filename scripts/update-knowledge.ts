import { runUpdateCycle } from "@arquiteure/updater";

async function main() {
  const r = await runUpdateCycle();
  console.log(`Ciclo concluído: ${r.checked} regras verificadas, ${r.changes} atualizações detetadas.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
