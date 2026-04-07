/**
 * Tipos de domínio partilhados — independentes de Prisma para evitar
 * acoplamento circular entre packages.
 */

export type ProjectType =
  | "REMODEL"
  | "EXTENSION"
  | "NEW_BUILD"
  | "INDUSTRIAL"
  | "HOUSING"
  | "MIXED_USE";

export type ProjectStage = "CONCEPT" | "PRELIM" | "EXEC" | "SUBMISSION";

export type AssetKind = "PHOTO" | "PLAN" | "AUDIO" | "DOC" | "MEASURE" | "TEXT";

export type GateKind =
  | "LEGAL"
  | "STRUCTURAL"
  | "URBAN"
  | "SAFETY"
  | "ACCESSIBILITY";

/** Programa funcional extraído da intenção do utilizador. */
export interface ProgramRequirements {
  rooms: RoomRequirement[];
  budgetEur?: number;
  constraints: string[];
  goals: string[];
  occupants?: number;
  accessibilityRequired?: boolean;
}

export interface RoomRequirement {
  kind: string; // ex: "kitchen", "bedroom", "bathroom"
  minAreaM2?: number;
  count?: number;
  notes?: string;
}

/** Layout 2D esquemático produzido pelo gerador. */
export interface Layout {
  units: "m";
  bbox: { width: number; height: number };
  rooms: LayoutRoom[];
  walls: LayoutWall[];
  openings: LayoutOpening[];
  ceilingHeight: number;
}

export interface LayoutRoom {
  id: string;
  kind: string;
  label: string;
  polygon: Array<[number, number]>;
  areaM2: number;
}

export interface LayoutWall {
  id: string;
  from: [number, number];
  to: [number, number];
  thickness: number;
  loadBearing?: boolean;
}

export interface LayoutOpening {
  id: string;
  wallId: string;
  kind: "DOOR" | "WINDOW";
  widthM: number;
  heightM: number;
  position: number; // 0..1 along wall
}

/** Resultado de validação de uma regra contra um projeto. */
export interface ValidationResult {
  ruleId: string;
  ruleCode: string;
  passed: boolean;
  severity: "INFO" | "WARN" | "BLOCK";
  message: string;
  field?: string;
  observed?: unknown;
  expected?: unknown;
}

export interface Diagnosis {
  summary: string;
  risks: string[];
  opportunities: string[];
  applicableRuleCodes: string[];
}

export interface ScoredAlternative {
  id: string;
  name: string;
  layout: Layout;
  validations: ValidationResult[];
  scores: {
    legal: number;
    functional: number;
    aesthetic: number;
    economic: number;
    overall: number;
  };
  rationaleMd: string;
}
