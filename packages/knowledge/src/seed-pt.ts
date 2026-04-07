import type { Predicate } from "./predicates.js";

/**
 * Subset funcional inicial das regras urbanísticas/construtivas portuguesas.
 * Não é exaustivo. Cada regra inclui texto humano + predicado executável.
 *
 * Fontes:
 * - RGEU (DL 38382/51 e revisões)
 * - RJUE (DL 555/99)
 * - DL 118/2013 (REH/RECS térmica)
 * - DL 220/2008 (RJ-SCIE)
 * - DL 163/2006 (acessibilidade)
 */
export interface SeedRule {
  code: string;
  source: string;
  category: string;
  title: string;
  textMd: string;
  predicate: Predicate;
}

export const PT_RULES: SeedRule[] = [
  {
    code: "RGEU-65",
    source: "DL 38382/51 (RGEU) art. 65.º",
    category: "HABITABILIDADE",
    title: "Pé-direito mínimo em compartimentos habitacionais",
    textMd:
      "Os compartimentos de habitação devem ter pé-direito mínimo de 2,40 m, " +
      "podendo as cozinhas e instalações sanitárias ter 2,20 m.",
    predicate: {
      type: "min",
      field: "ceilingHeight",
      value: 2.4,
      unit: "m",
      ruleCode: "RGEU-65",
      appliesTo: ["HOUSING", "REMODEL", "EXTENSION", "MIXED_USE", "NEW_BUILD"],
      severity: "BLOCK",
      message: "Pé-direito inferior a 2,40 m exigido pelo RGEU art. 65.º.",
    },
  },
  {
    code: "RGEU-66-QUARTO",
    source: "DL 38382/51 (RGEU) art. 66.º",
    category: "AREA_MINIMA",
    title: "Área mínima de quarto principal",
    textMd:
      "A área útil do quarto principal não pode ser inferior a 10,5 m². Quartos " +
      "secundários (duplos) ≥ 9 m²; quartos individuais ≥ 6,5 m².",
    predicate: {
      type: "roomMinArea",
      roomKind: "bedroom",
      minAreaM2: 9,
      ruleCode: "RGEU-66-QUARTO",
      appliesTo: ["HOUSING", "REMODEL", "EXTENSION", "MIXED_USE", "NEW_BUILD"],
      severity: "BLOCK",
      message: "Quarto com área inferior a 9 m² (RGEU art. 66.º).",
    },
  },
  {
    code: "RGEU-66-COZ",
    source: "DL 38382/51 (RGEU) art. 66.º",
    category: "AREA_MINIMA",
    title: "Área mínima de cozinha",
    textMd: "A cozinha deve ter área útil ≥ 6 m².",
    predicate: {
      type: "roomMinArea",
      roomKind: "kitchen",
      minAreaM2: 6,
      ruleCode: "RGEU-66-COZ",
      appliesTo: ["HOUSING", "REMODEL", "EXTENSION", "MIXED_USE", "NEW_BUILD"],
      severity: "BLOCK",
      message: "Cozinha com área inferior a 6 m² (RGEU art. 66.º).",
    },
  },
  {
    code: "RGEU-66-WC",
    source: "DL 38382/51 (RGEU) art. 66.º",
    category: "AREA_MINIMA",
    title: "Área mínima de instalação sanitária",
    textMd: "A instalação sanitária completa deve ter área útil ≥ 3,5 m².",
    predicate: {
      type: "roomMinArea",
      roomKind: "bathroom",
      minAreaM2: 3.5,
      ruleCode: "RGEU-66-WC",
      appliesTo: ["HOUSING", "REMODEL", "EXTENSION", "MIXED_USE", "NEW_BUILD"],
      severity: "BLOCK",
      message: "Instalação sanitária com área inferior a 3,5 m² (RGEU art. 66.º).",
    },
  },
  {
    code: "RGEU-71",
    source: "DL 38382/51 (RGEU) art. 71.º",
    category: "ILUMINACAO_VENTILACAO",
    title: "Iluminação e ventilação naturais",
    textMd:
      "Compartimentos habitáveis (quartos, salas, cozinhas) devem dispor de " +
      "vão de iluminação/ventilação natural directa para o exterior.",
    predicate: {
      type: "requiresWindow",
      roomKinds: ["bedroom", "livingroom", "kitchen"],
      ruleCode: "RGEU-71",
      appliesTo: ["HOUSING", "REMODEL", "EXTENSION", "MIXED_USE", "NEW_BUILD"],
      severity: "BLOCK",
      message: "Compartimento habitável sem vão de iluminação/ventilação (RGEU art. 71.º).",
    },
  },
  {
    code: "DL163-2006-CORR",
    source: "DL 163/2006 anexo, secção 2.3",
    category: "ACESSIBILIDADE",
    title: "Largura mínima de corredor acessível",
    textMd:
      "Os corredores em edifícios sujeitos ao regime de acessibilidade devem " +
      "ter largura mínima de 1,20 m.",
    predicate: {
      type: "requiresAccessRoute",
      minWidthM: 1.2,
      ruleCode: "DL163-2006-CORR",
      appliesTo: ["NEW_BUILD", "EXTENSION", "MIXED_USE", "INDUSTRIAL"],
      severity: "WARN",
      message: "Corredor com largura inferior a 1,20 m (DL 163/2006).",
    },
  },
  {
    code: "RJUE-555-USO",
    source: "DL 555/99 (RJUE) art. 4.º",
    category: "USO_DO_SOLO",
    title: "Compatibilidade de uso com classificação do solo",
    textMd:
      "A operação urbanística deve respeitar o uso permitido pelo PDM aplicável " +
      "à zona do prédio.",
    predicate: {
      type: "useAllowed",
      zone: "URBANO_RESIDENCIAL",
      allowedTypes: ["HOUSING", "REMODEL", "EXTENSION", "MIXED_USE"],
      ruleCode: "RJUE-555-USO",
      appliesTo: ["HOUSING", "REMODEL", "EXTENSION", "NEW_BUILD", "MIXED_USE"],
      severity: "BLOCK",
      message: "Tipo de operação não permitido pela classe de uso do solo.",
    },
  },
  {
    code: "PDM-LX-IOS",
    source: "PDM Lisboa — índice de ocupação do solo",
    category: "URBANISMO",
    title: "Índice de ocupação do solo (exemplo Lisboa)",
    textMd:
      "Para zonas residenciais de baixa densidade, o índice de ocupação do solo " +
      "máximo é de 0,5 (área de implantação ≤ 50% da área do lote).",
    predicate: {
      type: "max",
      field: "buildingFootprintRatio",
      value: 0.5,
      ruleCode: "PDM-LX-IOS",
      appliesTo: ["NEW_BUILD", "EXTENSION"],
      severity: "BLOCK",
      message: "Implantação excede 50% da área do lote (PDM Lisboa).",
    },
  },
];
