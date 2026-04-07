import { initTRPC, TRPCError } from "@trpc/server";

export interface Context {
  userId: string | null;
  role: "CLIENT" | "ARCHITECT" | "ENGINEER" | "ADMIN" | null;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

export const architectProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.role !== "ARCHITECT" && ctx.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Requer papel ARCHITECT" });
  }
  return next({ ctx });
});
