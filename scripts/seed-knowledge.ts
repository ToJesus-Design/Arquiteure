import { loadPortugueseRules } from "@arquiteure/knowledge";

async function main() {
  const r = await loadPortugueseRules();
  console.log(`Regras carregadas: ${r.inserted} novas, ${r.updated} atualizadas.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
