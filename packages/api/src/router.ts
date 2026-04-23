import { z } from "zod";
import { router, publicProcedure, authedProcedure, architectProcedure } from "./trpc.js";
import { prisma } from "@arquiteure/db";
import { audit, newVersion } from "@arquiteure/audit";
import { extractIntent } from "@arquiteure/intent";
import { analyzeImage } from "@arquiteure/vision";
import { speechToText } from "@arquiteure/voice";
import { generateAlternatives, score } from "@arquiteure/generator";
import { validate, summarize } from "@arquiteure/validator";
import { rulesForProjectType } from "@arquiteure/knowledge";
import { layoutToSvg } from "@arquiteure/drawing";
import { generateDossierPdf, memoriaDescritiva, layoutToDxf } from "@arquiteure/exporter";
import { ProgramRequirementsSchema } from "@arquiteure/core";
import { MusicIdentifier } from "@arquiteure/music";

const ProjectTypeZ = z.enum([
  "REMODEL",
  "EXTENSION",
  "NEW_BUILD",
  "INDUSTRIAL",
  "HOUSING",
  "MIXED_USE",
]);

export const appRouter = router({
  // Saúde
  health: publicProcedure.query(() => ({ ok: true, ts: Date.now() })),

  // Projeto
  project: router({
    create: authedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          type: ProjectTypeZ,
          municipality: z.string().optional(),
          description: z.string().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const p = await prisma.project.create({
          data: { ...input, ownerId: ctx.userId! },
        });
        await audit({
          actor: ctx.userId!,
          action: "PROJECT_CREATED",
          entity: "Project",
          entityId: p.id,
          after: p,
        });
        return p;
      }),

    list: authedProcedure.query(({ ctx }) =>
      prisma.project.findMany({ where: { ownerId: ctx.userId! }, orderBy: { updatedAt: "desc" } }),
    ),

    get: authedProcedure.input(z.object({ id: z.string() })).query(({ input }) =>
      prisma.project.findUniqueOrThrow({
        where: { id: input.id },
        include: { assets: true, versions: { orderBy: { createdAt: "desc" } } },
      }),
    ),

    uploadAsset: authedProcedure
      .input(
        z.object({
          projectId: z.string(),
          kind: z.enum(["PHOTO", "PLAN", "AUDIO", "DOC", "MEASURE", "TEXT"]),
          uri: z.string(),
          meta: z.record(z.unknown()).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const a = await prisma.asset.create({
          data: {
            projectId: input.projectId,
            kind: input.kind,
            uri: input.uri,
            metaJson: input.meta as object | undefined,
          },
        });
        await audit({
          actor: ctx.userId!,
          action: "ASSET_UPLOADED",
          entity: "Asset",
          entityId: a.id,
          after: a,
        });
        return a;
      }),
  }),

  // Extração de intenção
  intent: router({
    fromText: authedProcedure
      .input(z.object({ projectId: z.string(), text: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const program = await extractIntent({ text: input.text });
        const i = await prisma.intent.create({
          data: {
            projectId: input.projectId,
            summary: program.goals.join("; ") || "Intenção extraída",
            requirementsJson: program as object,
          },
        });
        await audit({
          actor: ctx.userId!,
          action: "INTENT_EXTRACTED",
          entity: "Intent",
          entityId: i.id,
          after: program,
        });
        return i;
      }),

    fromVoice: authedProcedure
      .input(z.object({ projectId: z.string(), audioBase64: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const buf = Buffer.from(input.audioBase64, "base64");
        const transcript = await speechToText(buf);
        const program = await extractIntent({ transcript });
        const i = await prisma.intent.create({
          data: {
            projectId: input.projectId,
            summary: transcript.slice(0, 200),
            requirementsJson: program as object,
          },
        });
        await audit({
          actor: ctx.userId!,
          action: "INTENT_FROM_VOICE",
          entity: "Intent",
          entityId: i.id,
          after: { transcript, program },
        });
        return { intent: i, transcript };
      }),
  }),

  // Visão
  vision: router({
    analyze: authedProcedure
      .input(
        z.object({
          imageBase64: z.string(),
          mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
        }),
      )
      .mutation(({ input }) => analyzeImage(input.imageBase64, input.mediaType)),
  }),

  // Design: gerar alternativas
  design: router({
    generate: authedProcedure
      .input(
        z.object({
          projectId: z.string(),
          program: ProgramRequirementsSchema,
          lotWidth: z.number().positive(),
          lotDepth: z.number().positive(),
          zone: z.string().optional(),
          count: z.number().int().min(1).max(6).default(3),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const project = await prisma.project.findUniqueOrThrow({ where: { id: input.projectId } });
        const layouts = generateAlternatives(
          input.program,
          { lotWidth: input.lotWidth, lotDepth: input.lotDepth },
          input.count,
        );
        const rules = await rulesForProjectType(project.type);

        const version = await newVersion({
          projectId: project.id,
          stage: "CONCEPT",
          snapshot: { program: input.program, lot: { w: input.lotWidth, d: input.lotDepth } },
          createdBy: ctx.userId!,
        });

        const alts = [];
        for (let i = 0; i < layouts.length; i++) {
          const layout = layouts[i]!;
          const validations = validate(rules, {
            projectType: project.type,
            layout,
            zone: input.zone,
            buildingFootprintRatio:
              (layout.bbox.width * layout.bbox.height) / (input.lotWidth * input.lotDepth),
          });
          const scores = score(layout, input.program, validations);
          const svg = layoutToSvg(layout);
          const saved = await prisma.alternative.create({
            data: {
              versionId: version.id,
              name: `Alternativa ${i + 1}`,
              descriptionMd: `Gerada automaticamente (variante ${i}).`,
              layoutJson: layout as object,
              scoreJson: { scores, validationSummary: summarize(validations) } as object,
              svgPreview: svg,
            },
          });
          alts.push({ ...saved, validations });
        }
        return { versionId: version.id, alternatives: alts };
      }),

    listAlternatives: authedProcedure
      .input(z.object({ versionId: z.string() }))
      .query(({ input }) =>
        prisma.alternative.findMany({ where: { versionId: input.versionId }, orderBy: { createdAt: "asc" } }),
      ),
  }),

  // Aprovações
  approval: router({
    approve: architectProcedure
      .input(
        z.object({
          versionId: z.string(),
          gate: z.enum(["LEGAL", "STRUCTURAL", "URBAN", "SAFETY", "ACCESSIBILITY"]),
          notes: z.string().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await prisma.approvalGate.findFirst({
          where: { versionId: input.versionId, gate: input.gate },
        });
        const g = existing
          ? await prisma.approvalGate.update({
              where: { id: existing.id },
              data: { granted: true, grantedBy: ctx.userId!, grantedAt: new Date(), notes: input.notes },
            })
          : await prisma.approvalGate.create({
              data: {
                versionId: input.versionId,
                gate: input.gate,
                granted: true,
                grantedBy: ctx.userId!,
                grantedAt: new Date(),
                notes: input.notes,
              },
            });
        await audit({
          actor: ctx.userId!,
          action: "APPROVAL_GRANTED",
          entity: "ApprovalGate",
          entityId: g.id,
          after: g,
        });
        return g;
      }),
  }),

  // Exportação
  export: router({
    dossierPdf: authedProcedure
      .input(z.object({ versionId: z.string(), alternativeId: z.string() }))
      .mutation(async ({ input }) => {
        const alt = await prisma.alternative.findUniqueOrThrow({
          where: { id: input.alternativeId },
          include: { version: { include: { project: true } } },
        });
        const layout = alt.layoutJson as unknown as import("@arquiteure/core").Layout;
        const rules = await rulesForProjectType(alt.version.project.type);
        const validations = validate(rules, {
          projectType: alt.version.project.type,
          layout,
        });
        const memoria = memoriaDescritiva({
          projectName: alt.version.project.name,
          projectType: alt.version.project.type,
          municipality: alt.version.project.municipality ?? "—",
          layout,
          validations,
        });
        const pdf = await generateDossierPdf({
          projectName: alt.version.project.name,
          ownerName: "—",
          municipality: alt.version.project.municipality ?? "—",
          stage: alt.version.stage,
          layout,
          validations,
          memoriaDescritivaMd: memoria,
          ruleCitations: rules.map((r) => ({ code: r.code, title: r.title, source: r.source })),
        });
        return { base64: pdf.toString("base64") };
      }),

    dxf: authedProcedure
      .input(z.object({ alternativeId: z.string() }))
      .mutation(async ({ input }) => {
        const alt = await prisma.alternative.findUniqueOrThrow({ where: { id: input.alternativeId } });
        const dxf = layoutToDxf(alt.layoutJson as unknown as import("@arquiteure/core").Layout);
        return { dxf };
      }),
  }),

  // Música
  music: router({
    listPosts: publicProcedure.query(() =>
      prisma.musicPost.findMany({ orderBy: { createdAt: "desc" } }),
    ),

    getPost: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) =>
        prisma.musicPost.findUniqueOrThrow({ where: { id: input.id } }),
      ),

    likePost: authedProcedure
      .input(z.object({ postId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const post = await prisma.musicPost.findUniqueOrThrow({ where: { id: input.postId } });

        // Reconhecimento: áudio → ACRCloud, fallback → metadados
        const identifier = new MusicIdentifier();
        const result = await identifier.identify({
          title: post.title,
          artist: post.artist ?? undefined,
          audioUrl: post.audioUrl ?? undefined,
        });

        const spotifyLink = result.links.find((l) => l.platform === "spotify") ?? null;

        const like = await prisma.musicLike.upsert({
          where: { postId_userId: { postId: input.postId, userId: ctx.userId! } },
          create: {
            postId: input.postId,
            userId: ctx.userId!,
            recognitionJson: result.recognition as object,
            spotifyUrl: spotifyLink?.url ?? null,
            spotifyTrackId: spotifyLink?.trackId ?? null,
            coverUrl: spotifyLink?.coverUrl ?? null,
            previewUrl: spotifyLink?.previewUrl ?? null,
          },
          update: {
            likedAt: new Date(),
            recognitionJson: result.recognition as object,
            spotifyUrl: spotifyLink?.url ?? null,
            spotifyTrackId: spotifyLink?.trackId ?? null,
            coverUrl: spotifyLink?.coverUrl ?? null,
            previewUrl: spotifyLink?.previewUrl ?? null,
          },
        });

        await audit({
          actor: ctx.userId!,
          action: "MUSIC_POST_LIKED",
          entity: "MusicLike",
          entityId: like.id,
          after: { postId: input.postId, recognition: result.recognition, spotifyUrl: spotifyLink?.url },
        });

        return {
          like,
          recognition: result.recognition,
          links: result.links,
          bestLink: result.bestLink,
        };
      }),

    unlikePost: authedProcedure
      .input(z.object({ postId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await prisma.musicLike.deleteMany({
          where: { postId: input.postId, userId: ctx.userId! },
        });
        return { unliked: true };
      }),

    myLikes: authedProcedure.query(({ ctx }) =>
      prisma.musicLike.findMany({
        where: { userId: ctx.userId! },
        include: { post: true },
        orderBy: { likedAt: "desc" },
      }),
    ),

    getLikeStatus: authedProcedure
      .input(z.object({ postId: z.string() }))
      .query(({ input, ctx }) =>
        prisma.musicLike.findUnique({
          where: { postId_userId: { postId: input.postId, userId: ctx.userId! } },
        }),
      ),
  }),
});

export type AppRouter = typeof appRouter;
