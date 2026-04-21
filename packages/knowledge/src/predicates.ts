/**
 * Predicados executáveis usados pelo validator. Cada Rule armazena um destes
 * em machineJson e o motor avalia contra um Layout/Project.
 */

export type Predicate =
  | MinPredicate
  | MaxPredicate
  | RoomMinAreaPredicate
  | RoomMinDimensionPredicate
  | RequiresAccessRoutePredicate
  | RequiresWindowPredicate
  | UseAllowedPredicate
  | MinDoorWidthPredicate;

export interface PredicateBase {
  ruleCode: string;
  appliesTo?: string[]; // tipos de projeto a que aplica
  severity: "INFO" | "WARN" | "BLOCK";
  message: string;
}

export interface MinPredicate extends PredicateBase {
  type: "min";
  field: "ceilingHeight";
  value: number;
  unit: "m";
}

export interface MaxPredicate extends PredicateBase {
  type: "max";
  field: "buildingFootprintRatio";
  value: number;
}

export interface RoomMinAreaPredicate extends PredicateBase {
  type: "roomMinArea";
  roomKind: string;
  minAreaM2: number;
}

export interface RequiresAccessRoutePredicate extends PredicateBase {
  type: "requiresAccessRoute";
  minWidthM: number;
}

export interface RequiresWindowPredicate extends PredicateBase {
  type: "requiresWindow";
  roomKinds: string[];
}

export interface UseAllowedPredicate extends PredicateBase {
  type: "useAllowed";
  zone: string;
  allowedTypes: string[];
}

export interface RoomMinDimensionPredicate extends PredicateBase {
  type: "roomMinDimension";
  roomKind: string;
  minDimensionM: number;
}

export interface MinDoorWidthPredicate extends PredicateBase {
  type: "minDoorWidth";
  minWidthM: number;
}
