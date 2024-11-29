import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { generateRecipeImage } from "@/utils/ai";
import { TRPCError } from '@trpc/server';
import type { Context } from "@/server/api/trpc";
import * as fs from 'fs';
import * as path from 'path';
import { getRecipeSuggestions } from "@/utils/ai";

export const recipeRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.db.recipe.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }),

  getById: publicProcedure
    .input(z.string())
    .query(({ ctx, input }) => {
      return ctx.db.recipe.findUnique({
        where: { id: input },
      });
    }),

  create: publicProcedure
    .input(z.object({
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
    }))
    .mutation(async ({ ctx, input }) => {
      const { ingredients, instructions, ...rest } = input;
      return ctx.db.recipe.create({
        data: {
          ...rest,
          ingredients: JSON.stringify(ingredients),
          instructions: JSON.stringify(instructions),
          nutrition: rest.nutrition ?? null,
          imageUrl: rest.imageUrl ?? null,
        },
      });
    }),

  update: publicProcedure
    .input(z.object({
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
    }))
    .mutation(async ({ ctx, input }) => {
      const { data } = input;
      const updateData = {
        ...data,
        ingredients: data.ingredients ? JSON.stringify(data.ingredients) : undefined,
        instructions: data.instructions ? JSON.stringify(data.instructions) : undefined,
      };
      return ctx.db.recipe.update({
        where: { id: input.id },
        data: updateData,
      });
    }),

  uploadImage: publicProcedure
    .input(z.object({
      image: z.string(), // base64 encoded image
      contentType: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const base64Data = input.image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const extension = input.contentType.split('/')[1];
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
        const publicDir = path.join(process.cwd(), 'public', 'uploads');
        
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }

        const filePath = path.join(publicDir, filename);
        fs.writeFileSync(filePath, buffer);
        return `/uploads/${filename}`;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to upload image',
        });
      }
    }),

  deleteImage: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      try {
        const filePath = path.join(process.cwd(), 'public', input);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return true;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete image',
        });
      }
    }),

  getSuggestions: publicProcedure
    .input(z.object({
      title: z.string(),
      isImprovement: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const suggestions = await getRecipeSuggestions(input.title, input.isImprovement);
        return suggestions;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get recipe suggestions',
        });
      }
    }),

  recordCooking: protectedProcedure
    .input(z.object({
      recipeId: z.string(),
      startedAt: z.date(),
      completedAt: z.date().nullable(),
      currentStep: z.number(),
      notes: z.string().nullable(),
      actualTime: z.number().nullable(),
      servingsCooked: z.number().nullable(),
      stepFeedback: z.string().nullable()
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cookingHistory.create({
        data: input,
        include: {
          recipe: true
        }
      });
    }),

  getCookingHistory: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.cookingHistory.findMany({
        where: {
          recipeId: input,
        },
        include: {
          recipe: {
            select: {
              title: true,
            },
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
      });
    }),

  getActiveSessions: protectedProcedure
    .input(z.object({ recipeId: z.string() }).optional())
    .query(async ({ ctx, input }) => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      return ctx.db.cookingHistory.findMany({
        where: {
          ...(input?.recipeId ? { recipeId: input.recipeId } : {}),
          completedAt: null,
          startedAt: {
            gte: twoHoursAgo
          }
        },
        include: {
          recipe: true
        },
        orderBy: {
          startedAt: 'desc'
        }
      });
    }),

  getCurrentCookingSession: protectedProcedure
    .input(z.object({
      recipeId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      return ctx.db.cookingHistory.findFirst({
        where: {
          recipeId: input.recipeId,
          completedAt: null,
          startedAt: {
            gte: twoHoursAgo
          }
        },
        include: {
          recipe: true
        },
        orderBy: {
          startedAt: 'desc'
        }
      });
    }),

  deleteCookingSession: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cookingHistory.delete({
        where: {
          id: input.id,
        },
      });
    }),

  updateStep: protectedProcedure
    .input(z.object({
      recipeId: z.string(),
      stepIndex: z.number(),
      newInstruction: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const recipe = await ctx.db.recipe.findUnique({
        where: { id: input.recipeId },
      });

      if (!recipe) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Recipe not found',
        });
      }

      const instructions = JSON.parse(recipe.instructions);
      instructions[input.stepIndex] = input.newInstruction;

      return ctx.db.recipe.update({
        where: { id: input.recipeId },
        data: {
          instructions: JSON.stringify(instructions),
        },
      });
    }),

  generateImage: publicProcedure
    .input(z.object({
      title: z.string(),
      ingredients: z.array(z.object({
        name: z.string(),
        amount: z.number(),
        unit: z.string(),
      })),
      cuisineType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await generateRecipeImage(input);
      if (result.error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error
        });
      }
      return { imageUrl: result.imageUrl };
    }),
}); 