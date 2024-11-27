import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '../db';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { getRecipeSuggestions } from '@/utils/claude';

interface RecipeAdjustment {
  type: 'ingredient' | 'instruction';
  index: number;
  originalValue: string;
  adjustedValue: string;
}

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
        console.log('Starting image upload...');
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = input.image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Generate a unique filename
        const extension = input.contentType.split('/')[1];
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extension}`;
        
        // Save the file to the public directory
        const publicDir = path.join(process.cwd(), 'public', 'uploads');
        console.log('Public directory:', publicDir);
        
        // Create the uploads directory if it doesn't exist
        if (!fs.existsSync(publicDir)) {
          console.log('Creating uploads directory...');
          fs.mkdirSync(publicDir, { recursive: true });
        }

        const filePath = path.join(publicDir, filename);
        console.log('Writing file to:', filePath);
        fs.writeFileSync(filePath, buffer);
        console.log('File written successfully');

        // Return the URL path to the image
        const imageUrl = `/uploads/${filename}`;
        console.log('Image URL:', imageUrl);
        return imageUrl;
      } catch (error) {
        console.error('Error in uploadImage:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to upload image',
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
    .input(z.object({
      recipeId: z.string(),
      startedAt: z.date(),
      servingsCooked: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
        // First verify recipe exists
        const recipe = await prisma.recipe.findUnique({
          where: { id: input.recipeId },
          select: { id: true },
        });

        if (!recipe) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recipe not found',
          });
        }

        // Create cooking history record
        const session = await prisma.cookingHistory.create({
          data: {
            recipeId: input.recipeId,
            startedAt: input.startedAt,
            actualTime: 0,
            servingsCooked: input.servingsCooked,
            notes: '',
            completedAt: new Date(0),
          },
        });

        return session;
      } catch (error) {
        console.error('Error recording cooking:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to record cooking session',
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

  deleteImage: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      try {
        console.log('Deleting image:', input);
        // Extract filename from the URL path
        const filename = input.split('/').pop();
        if (!filename) {
          throw new Error('Invalid image URL');
        }

        // Construct the full file path
        const filePath = path.join(process.cwd(), 'public', input);
        console.log('Deleting file at:', filePath);

        // Check if file exists before attempting to delete
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('File deleted successfully');
          return true;
        } else {
          console.log('File not found');
          return false;
        }
      } catch (error) {
        console.error('Error deleting image:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete image',
        });
      }
    }),

  getSuggestions: publicProcedure
    .input(z.object({
      title: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const suggestions = await getRecipeSuggestions(input.title);
        return suggestions;
      } catch (error) {
        console.error('Error getting recipe suggestions:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get recipe suggestions',
        });
      }
    }),

  saveCookingNotes: publicProcedure
    .input(z.object({
      recipeId: z.string(),
      cookingSessionId: z.string(),
      notes: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const { cookingSessionId, notes } = input;
        
        // Update session notes
        const updatedHistory = await prisma.cookingHistory.update({
          where: { id: cookingSessionId },
          data: { notes },
        });

        return updatedHistory;
      } catch (error) {
        console.error('Error saving cooking notes:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save cooking notes',
        });
      }
    }),

  saveRecipeAdjustments: publicProcedure
    .input(z.object({
      recipeId: z.string(),
      adjustments: z.array(z.object({
        type: z.enum(['ingredient', 'instruction']),
        index: z.number(),
        originalValue: z.string(),
        adjustedValue: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      try {
        const { recipeId, adjustments } = input;
        
        // Get current recipe
        const recipe = await prisma.recipe.findUnique({
          where: { id: recipeId },
        });

        if (!recipe) {
          throw new Error('Recipe not found');
        }

        // Apply adjustments
        let ingredients = JSON.parse(recipe.ingredients);
        let instructions = JSON.parse(recipe.instructions);

        adjustments.forEach(adj => {
          if (adj.type === 'instruction') {
            instructions[adj.index] = adj.adjustedValue;
          } else {
            // For ingredients, we need to parse the adjusted value
            // This assumes the adjustedValue is in the format "amount unit name"
            const parts = adj.adjustedValue.split(' ');
            const amount = parseFloat(parts[0]);
            const unit = parts[1];
            const name = parts.slice(2).join(' ');
            
            if (!isNaN(amount)) {
              ingredients[adj.index] = {
                ...ingredients[adj.index],
                amount,
                unit,
                name,
              };
            }
          }
        });

        // Update recipe with new values
        const updatedRecipe = await prisma.recipe.update({
          where: { id: recipeId },
          data: {
            ingredients: JSON.stringify(ingredients),
            instructions: JSON.stringify(instructions),
            updatedAt: new Date(),
          },
        });

        return updatedRecipe;
      } catch (error) {
        console.error('Error saving recipe adjustments:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save recipe adjustments',
        });
      }
    }),

  getCurrentCookingSession: publicProcedure
    .input(z.object({
      recipeId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        // Get the most recent active session for this recipe
        const session = await prisma.cookingHistory.findFirst({
          where: {
            recipeId: input.recipeId,
            completedAt: null,
          },
          orderBy: {
            startedAt: 'desc',
          },
        });

        return session;
      } catch (error) {
        console.error('Error getting current session:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get current cooking session',
        });
      }
    }),

  finishSession: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      actualTime: z.number(),
      servingsCooked: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
        const { sessionId, actualTime, servingsCooked } = input;
        
        // Complete the session
        const updatedSession = await prisma.cookingHistory.update({
          where: { id: sessionId },
          data: {
            completedAt: new Date(),
            actualTime,
            servingsCooked,
          },
        });

        return updatedSession;
      } catch (error) {
        console.error('Error finishing session:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to complete cooking session',
        });
      }
    }),
}); 