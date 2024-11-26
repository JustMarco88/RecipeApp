import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '../db';

export const recipeRouter = router({
  getAll: publicProcedure.query(async () => {
    return prisma.recipe.findMany();
  }),

  getById: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      return prisma.recipe.findUnique({
        where: { id: input },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string(),
        ingredients: z.array(z.object({
          name: z.string(),
          amount: z.number(),
          unit: z.string(),
        })),
        instructions: z.array(z.string()),
        prepTime: z.number(),
        cookTime: z.number(),
        servings: z.number(),
        difficulty: z.enum(['Easy', 'Medium', 'Hard']),
        cuisineType: z.string().optional(),
        tags: z.array(z.string()),
        imageUrl: z.string().optional(),
        nutrition: z.object({}).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.recipe.create({
        data: {
          ...input,
          ingredients: input.ingredients,
          instructions: input.instructions,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          title: z.string().optional(),
          ingredients: z.array(z.object({
            name: z.string(),
            amount: z.number(),
            unit: z.string(),
          })).optional(),
          instructions: z.array(z.string()).optional(),
          prepTime: z.number().optional(),
          cookTime: z.number().optional(),
          servings: z.number().optional(),
          difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
          cuisineType: z.string().optional(),
          tags: z.array(z.string()).optional(),
          imageUrl: z.string().optional(),
          nutrition: z.object({}).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.recipe.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  delete: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      return prisma.recipe.delete({
        where: { id: input },
      });
    }),
}); 