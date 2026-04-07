import type { Layout, ValidationResult } from "@arquiteure/core";

/**
 * Gera memória descritiva e justificativa em Markdown, com formato
 * aceitável por câmaras municipais portuguesas no âmbito do RJUE.
 */
export function memoriaDescritiva(opts: {
  projectName: string;
  projectType: string;
  municipality: string;
  layout: Layout;
  validations: ValidationResult[];
}): string {
  const totalArea = opts.layout.rooms.reduce((s, r) => s + r.areaM2, 0);
  const blockers = opts.validations.filter((v) => !v.passed && v.severity === "BLOCK");
  const warns = opts.validations.filter((v) => !v.passed && v.severity === "WARN");

  return `# Memória Descritiva e Justificativa

## 1. Identificação
- Projeto: **${opts.projectName}**
- Tipo: ${opts.projectType}
- Município: ${opts.municipality}

## 2. Objeto
Descreve-se a proposta arquitetónica relativa à intervenção acima identificada,
elaborada no âmbito do Regime Jurídico da Urbanização e Edificação (DL 555/99
na sua redação atual).

## 3. Programa
Área útil total: **${totalArea.toFixed(2)} m²**. Pé-direito ${opts.layout.ceilingHeight} m.

| Compartimento | Tipo | Área (m²) |
|---|---|---|
${opts.layout.rooms.map((r) => `| ${r.label} | ${r.kind} | ${r.areaM2.toFixed(2)} |`).join("\n")}

## 4. Enquadramento Legal
A proposta foi verificada automaticamente contra o RGEU, DL 163/2006 (acessibilidade),
RJ-SCIE (DL 220/2008) e instrumento de gestão territorial municipal aplicável.

### 4.1 Não conformidades bloqueantes
${blockers.length === 0 ? "Nenhuma identificada." : blockers.map((b) => `- **${b.ruleCode}**: ${b.message}`).join("\n")}

### 4.2 Avisos
${warns.length === 0 ? "Nenhum." : warns.map((w) => `- ${w.ruleCode}: ${w.message}`).join("\n")}

## 5. Declaração
O presente documento reflete a verificação automatizada efetuada pela plataforma
Arquiteure, não dispensando a responsabilidade técnica do autor de projeto inscrito
na Ordem dos Arquitetos.
`;
}
