import { z } from "zod";

export const RoomRequirementSchema = z.object({
  kind: z.string(),
  minAreaM2: z.number().positive().optional(),
  count: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const ProgramRequirementsSchema = z.object({
  rooms: z.array(RoomRequirementSchema),
  budgetEur: z.number().nonnegative().optional(),
  constraints: z.array(z.string()),
  goals: z.array(z.string()),
  occupants: z.number().int().positive().optional(),
  accessibilityRequired: z.boolean().optional(),
});

export const LayoutRoomSchema = z.object({
  id: z.string(),
  kind: z.string(),
  label: z.string(),
  polygon: z.array(z.tuple([z.number(), z.number()])),
  areaM2: z.number().positive(),
});

export const LayoutWallSchema = z.object({
  id: z.string(),
  from: z.tuple([z.number(), z.number()]),
  to: z.tuple([z.number(), z.number()]),
  thickness: z.number().positive(),
  loadBearing: z.boolean().optional(),
});

export const LayoutOpeningSchema = z.object({
  id: z.string(),
  wallId: z.string(),
  kind: z.enum(["DOOR", "WINDOW"]),
  widthM: z.number().positive(),
  heightM: z.number().positive(),
  position: z.number().min(0).max(1),
});

export const LayoutSchema = z.object({
  units: z.literal("m"),
  bbox: z.object({ width: z.number().positive(), height: z.number().positive() }),
  rooms: z.array(LayoutRoomSchema),
  walls: z.array(LayoutWallSchema),
  openings: z.array(LayoutOpeningSchema),
  ceilingHeight: z.number().positive(),
});

export const DiagnosisSchema = z.object({
  summary: z.string(),
  risks: z.array(z.string()),
  opportunities: z.array(z.string()),
  applicableRuleCodes: z.array(z.string()),
});

export const StructuredResponseSchema = z.object({
  intentSummary: z.string(),
  spaceAnalysis: z.string(),
  solutions: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
    }),
  ),
  risks: z.array(z.string()),
  nextIteration: z.string(),
  closed: z.boolean(),
});

export type StructuredResponse = z.infer<typeof StructuredResponseSchema>;
