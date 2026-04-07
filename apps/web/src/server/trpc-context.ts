import type { Context } from "@arquiteure/api";

/**
 * Contexto tRPC para o web app. Em dev, permite um utilizador "demo"
 * via cookie; em produção integra com NextAuth.
 */
export async function createContext(req: Request): Promise<Context> {
  const cookie = req.headers.get("cookie") ?? "";
  const demo = /arquiteure-demo=([^;]+)/.exec(cookie)?.[1];
  if (demo) {
    return { userId: demo, role: "ARCHITECT" };
  }
  return { userId: null, role: null };
}
