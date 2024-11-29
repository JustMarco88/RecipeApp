import { createTRPCRouter } from "@/server/api/trpc";
import { recipeRouter } from "./routers/recipe";

export const appRouter = createTRPCRouter({
  recipe: recipeRouter,
});

export type AppRouter = typeof appRouter; 