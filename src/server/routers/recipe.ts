import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '../db';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';

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

  uploadImage: publicProcedure
    .input(z.object({
      image: z.string(), // base64 encoded image
      contentType: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = input.image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Generate a unique filename
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${input.contentType.split('/')[1]}`;
        
        // Save the file to the public directory
        const fs = require('fs');
        const path = require('path');
        const publicDir = path.join(process.cwd(), 'public', 'uploads');
        
        // Create the uploads directory if it doesn't exist
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }

        const filePath = path.join(publicDir, filename);
        fs.writeFileSync(filePath, buffer);

        // Return the URL path to the image
        return `/uploads/${filename}`;
      } catch (error) {
        console.error('Error uploading image:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to upload image',
        });
      }
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
          imageUrl: rest.imageUrl ? rest.imageUrl : null,
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
      try {
        // First verify recipe exists
        const recipe = await prisma.recipe.findUnique({
          where: { id: input.recipeId },
          select: { id: true, title: true }, // Only select what we need
        });

        if (!recipe) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recipe not found',
          });
        }

        // Create cooking history record
        const result = await prisma.cookingHistory.create({
          data: {
            recipeId: input.recipeId,
            startedAt: new Date(input.startedAt),
            completedAt: new Date(input.completedAt),
            actualTime: input.actualTime,
            servingsCooked: input.servingsCooked,
          },
        });

        return result;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          // Handle known Prisma errors
          if (error.code === 'P2002') {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'A record for this cooking session already exists',
            });
          }
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Database error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to record cooking history',
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
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch cooking history',
        });
      }
    }),
}); 