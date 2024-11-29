import { initTRPC } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import superjson from "superjson";
import { ZodError } from "zod";
import { prisma } from "@/server/db";

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  return {
    db: prisma,
  };
};

export type Context = {
  db: typeof prisma;
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure;

export type RouterInputs = {
  recipe: {
    recordCooking: {
      recipeId: string;
      startedAt: Date;
      completedAt: Date | null;
      currentStep: number;
      notes: string | null;
      actualTime: number | null;
      servingsCooked: number | null;
      stepFeedback: string | null;
    };
  };
}; 