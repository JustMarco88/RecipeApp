import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '../db';
import { TRPCError } from '@trpc/server';

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
        nutrition: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { ingredients, instructions, ...rest } = input;
      return prisma.recipe.create({
        data: {
          ...rest,
          ingredients: JSON.stringify(ingredients),
          instructions: JSON.stringify(instructions),
          nutrition: rest.nutrition ? rest.nutrition : null,
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
          nutrition: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const { data } = input;
      const updateData = {
        ...data,
        ingredients: data.ingredients ? JSON.stringify(data.ingredients) : undefined,
        instructions: data.instructions ? JSON.stringify(data.instructions) : undefined,
      };
      return prisma.recipe.update({
        where: { id: input.id },
        data: updateData,
      });
    }),

  delete: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      return prisma.recipe.delete({
        where: { id: input },
      });
    }),

  recordCooking: publicProcedure
    .input(
      z.object({
        recipeId: z.string(),
        startedAt: z.date(),
        completedAt: z.date(),
        actualTime: z.number(),
        servingsCooked: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      if (!prisma) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection not initialized',
        });
      }

      try {
        console.log('Recording cooking history with input:', input);

        // Verify recipe exists
        const recipe = await prisma.recipe.findUnique({
          where: { id: input.recipeId },
        });

        if (!recipe) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recipe not found',
          });
        }

        console.log('Found recipe:', recipe.title);

        // Record cooking history
        const result = await prisma.cookingHistory.create({
          data: {
            recipeId: input.recipeId,
            startedAt: new Date(input.startedAt),
            completedAt: new Date(input.completedAt),
            actualTime: input.actualTime,
            servingsCooked: input.servingsCooked,
          },
        });

        console.log('Successfully recorded cooking history:', result);
        return result;
      } catch (error: any) {
        console.error('Detailed error recording cooking history:', {
          error: error.message,
          stack: error.stack,
          input,
        });

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to record cooking history: ${error.message}`,
          cause: error,
        });
      }
    }),

  getCookingHistory: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        return await prisma.cookingHistory.findMany({
          where: { recipeId: input },
          orderBy: { completedAt: 'desc' },
          include: {
            recipe: {
              select: {
                title: true,
              },
            },
          },
        });
      } catch (error) {
        console.error('Error fetching cooking history:', error);
        throw new Error('Failed to fetch cooking history');
      }
    }),
}); 