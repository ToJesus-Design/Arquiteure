import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@arquiteure/api";

export const trpc = createTRPCReact<AppRouter>();
