import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '../db';
import { TRPCError } from '@trpc/server';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { getRecipeSuggestions } from '@/utils/claude';
import { generateRecipeImage } from '@/utils/xai';
import fetch from 'node-fetch';
import { type RecipeImprovement } from "@/types/recipe"

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
      completedAt: z.date(),
      servingsCooked: z.number(),
      notes: z.string(),
      actualTime: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
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

        console.log('Creating cooking history with input:', input);

        // Create cooking history record
        const session = await prisma.cookingHistory.create({
          data: {
            recipeId: input.recipeId,
            startedAt: input.startedAt,
            completedAt: input.completedAt,
            actualTime: input.actualTime,
            servingsCooked: input.servingsCooked,
            notes: input.notes,
          },
        });

        console.log('Created cooking history:', session);
        return session;
      } catch (error) {
        console.error('Error in recordCooking:', error);
        if (error instanceof Error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Database error: ${error.message}`,
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
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
      const prompt = `You are a professional chef and recipe expert. I need you to provide recipe details in JSON format.
      For the recipe title "${input.title}", respond with ONLY a JSON object - no markdown, no explanations, no additional text.
      
      The response must be a valid JSON object exactly matching this interface:
      {
        "ingredients": [
          {
            "name": "string",
            "amount": number,
            "unit": "string"
          }
        ],
        "instructions": ["string"],
        "prepTime": number,
        "cookTime": number,
        "difficulty": "Easy" | "Medium" | "Hard",
        "cuisineType": "string",
        "tags": ["string"]
      }
      
      Requirements:
      - Response must be a single, valid JSON object
      - No text before or after the JSON
      - All numbers must be numeric (not strings)
      - All measurements MUST be in metric units:
        * Use grams (g) for solid ingredients
        * Use milliliters (ml) for liquids
        * Use centimeters (cm) or millimeters (mm) for dimensions
        * Use Celsius (°C) for temperatures
      - Ingredients must have precise measurements (e.g., "200g flour" not "1 cup flour")
      - Instructions should be clear, step-by-step array items with:
        * Exact temperatures (e.g., "Preheat oven to 180°C")
        * Precise timings (e.g., "Knead for 8 minutes")
        * Specific dimensions (e.g., "Cut into 2cm cubes")
        * Visual/sensory cues for doneness
      - Times must be numbers in minutes
      - Difficulty must be exactly "Easy", "Medium", or "Hard"
      - Tags should be an array of relevant keywords

      Example ingredient format:
      {
        "name": "all-purpose flour",
        "amount": 250,
        "unit": "g"
      }

      Example instruction format:
      "Heat oil in a pan to 180°C (medium-high heat), add 100g diced onions (1cm cubes) and cook for 5 minutes until translucent"

      IMPORTANT: Always use metric measurements and Celsius temperatures. Be specific and precise with all measurements.`;

      return getRecipeSuggestions(prompt, false);
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
          include: {
            recipe: {
              select: {
                title: true,
              },
            },
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

  getActiveSessions: publicProcedure
    .query(async () => {
      try {
        // Get all active (incomplete) cooking sessions
        const sessions = await prisma.cookingHistory.findMany({
          where: {
            completedAt: null,
          },
          orderBy: {
            startedAt: 'desc',
          },
          include: {
            recipe: true,
          },
        });

        return sessions;
      } catch (error) {
        console.error('Error getting active sessions:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get active cooking sessions',
        });
      }
    }),

  finishSession: publicProcedure
    .input(z.object({
      recipeId: z.string(),
      startedAt: z.date(),
      completedAt: z.date(),
      notes: z.string(),
      actualTime: z.number(),
      servingsCooked: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Update the session
        await prisma.cookingHistory.updateMany({
          where: {
            recipeId: input.recipeId,
            startedAt: input.startedAt,
            completedAt: null,
          },
          data: {
            completedAt: input.completedAt,
            notes: input.notes,
            actualTime: input.actualTime,
            servingsCooked: input.servingsCooked,
          },
        });

        return true;
      } catch (error) {
        console.error('Error finishing session:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to finish cooking session',
        });
      }
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
      try {
        console.log('Starting image generation for recipe:', input.title);
        const result = await generateRecipeImage(
          input.title,
          input.ingredients,
          input.cuisineType
        );

        if (result.error) {
          console.error('Error from OpenAI:', result.error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: result.error,
          });
        }

        if (!result.imageUrl) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'No image URL returned from OpenAI',
          });
        }

        console.log('Got image URL from OpenAI:', result.imageUrl);

        // Download and save the image
        const imageResponse = await fetch(result.imageUrl);
        if (!imageResponse.ok) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to download generated image',
          });
        }

        const buffer = Buffer.from(await imageResponse.arrayBuffer());
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.png`;
        const publicDir = path.join(process.cwd(), 'public', 'uploads');
        
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }

        const filePath = path.join(publicDir, filename);
        fs.writeFileSync(filePath, buffer);

        const localUrl = `/uploads/${filename}`;
        console.log('Saved image locally:', localUrl);
        return localUrl;

      } catch (error) {
        console.error('Error in generateImage:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate image',
        });
      }
    }),

  deleteCookingSession: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      try {
        await prisma.cookingHistory.delete({
          where: { id: input },
        });
        return true;
      } catch (error) {
        console.error('Error deleting cooking session:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete cooking session',
        });
      }
    }),

  saveSession: publicProcedure
    .input(z.object({
      recipeId: z.string(),
      currentStep: z.number(),
      notes: z.string(),
      ingredients: z.string(),
      instructions: z.string(),
      startTime: z.date(),
    }))
    .mutation(async ({ input }) => {
      try {
        // First, mark any existing incomplete sessions as abandoned
        await prisma.cookingHistory.updateMany({
          where: {
            recipeId: input.recipeId,
            completedAt: null,
          },
          data: {
            completedAt: new Date(),
            notes: input.notes ? `${input.notes} (Session abandoned)` : 'Session abandoned'
          }
        });

        // Then create the new session
        return await prisma.cookingHistory.create({
          data: {
            recipeId: input.recipeId,
            currentStep: input.currentStep,
            notes: input.notes,
            ingredients: input.ingredients,
            instructions: input.instructions,
            startedAt: input.startTime,
          },
        });
      } catch (error) {
        console.error('Error saving session:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save cooking session',
        });
      }
    }),

  resumeSession: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      try {
        return await prisma.cookingHistory.findUnique({
          where: { id: input },
        });
      } catch (error) {
        console.error('Error resuming session:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to resume cooking session',
        });
      }
    }),

  updateStep: publicProcedure
    .input(z.object({
      recipeId: z.string(),
      instructions: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        return await prisma.recipe.update({
          where: { id: input.recipeId },
          data: {
            instructions: input.instructions,
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        console.error('Error updating step:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update recipe step',
        });
      }
    }),

  getRecipeImprovements: publicProcedure
    .input(z.object({
      recipe: z.object({
        title: z.string(),
        instructions: z.array(z.string()),
        feedback: z.array(z.object({
          stepIndex: z.number(),
          liked: z.boolean(),
        })),
        notes: z.string(),
        actualTime: z.number(),
        expectedTime: z.number()
      }),
    }))
    .mutation(async ({ input }) => {
      const prompt = `As an expert chef, please suggest improvements for this recipe based on user feedback:

Recipe: ${input.recipe.title}

Current Instructions:
${input.recipe.instructions.map((step, i) => `${i + 1}. ${step}`).join('\n')}

User Feedback:
${input.recipe.instructions.map((step, i) => {
  const feedback = input.recipe.feedback.find(f => f.stepIndex === i);
  return `Step ${i + 1} was ${feedback?.liked ? 'liked' : 'disliked'}: "${step}"`;
}).join('\n')}

Cooking Notes: ${input.recipe.notes}
Actual Cooking Time: ${input.recipe.actualTime} minutes (Expected: ${input.recipe.expectedTime} minutes)

Please suggest specific improvements to make this recipe better, focusing on:
1. Steps that received negative feedback
2. Clarifying instructions with precise measurements (always use metric units: grams, milliliters, centimeters)
3. Adding helpful tips about temperature (always in Celsius), timing, and technique
4. Improving technique with specific details (e.g., exact knife cuts in mm/cm, pan temperature)
5. Enhancing flavors with precise seasoning measurements
6. Adding visual or sensory cues for doneness

Format your response as a JSON object with these fields:
- improvedSteps: array of strings with improved instructions (include metric measurements)
- summary: brief explanation of main improvements
- tips: array of strings with additional cooking tips (include metric measurements and temperatures)

Example tip format:
- "For perfectly diced onions, cut into 5mm cubes"
- "Heat the pan to 180°C (medium-high heat) before adding oil"
- "Season with 4g salt per 500g of vegetables"

IMPORTANT: Ensure your response is valid JSON and contains all required fields. Always use metric measurements and Celsius temperatures.`;

      return getRecipeSuggestions(prompt, true);
    }),

  updateRecipe: publicProcedure
    .input(z.object({
      id: z.string(),
      instructions: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        return await prisma.recipe.update({
          where: { id: input.id },
          data: {
            instructions: input.instructions,
            updatedAt: new Date(),
          },
        });
      } catch (error) {
        console.error('Error updating recipe:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update recipe',
        });
      }
    }),
}); 