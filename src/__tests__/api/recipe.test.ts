import { type inferProcedureInput } from '@trpc/server'
import { type AppRouter } from '@/server/api/root'
import { createTRPCContext } from '@/server/api/trpc'
import { appRouter } from '@/server/api/root'
import { type Recipe } from '@/types/recipe'

describe('Recipe Router Integration Tests', () => {
  const ctx = createTRPCContext({ session: null })
  const caller = appRouter.createCaller(ctx)

  const mockRecipe: Recipe = {
    id: '1',
    title: 'Test Recipe',
    ingredients: JSON.stringify([
      { name: 'Ingredient 1', amount: 1, unit: 'cup' },
      { name: 'Ingredient 2', amount: 2, unit: 'tbsp' },
    ]),
    instructions: JSON.stringify(['Step 1: Do something', 'Step 2: Do something else']),
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    difficulty: 'Medium',
    cuisineType: 'Italian',
    tags: ['test', 'integration'],
    imageUrl: null,
    nutrition: null,
    timers: JSON.stringify([]),
    userId: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAll', () => {
    it('returns all recipes', async () => {
      const result = await caller.recipe.getAll()
      expect(Array.isArray(result)).toBe(true)
    })

    it('handles database errors', async () => {
      // Mock prisma error
      jest.spyOn(ctx.prisma.recipe, 'findMany').mockRejectedValueOnce(new Error('DB Error'))

      await expect(caller.recipe.getAll()).rejects.toThrow('Failed to fetch recipes')
    })
  })

  describe('create', () => {
    it('creates a new recipe', async () => {
      type Input = inferProcedureInput<AppRouter['recipe']['create']>
      const input: Input = {
        title: mockRecipe.title,
        ingredients: mockRecipe.ingredients,
        instructions: mockRecipe.instructions,
        prepTime: mockRecipe.prepTime,
        cookTime: mockRecipe.cookTime,
        servings: mockRecipe.servings,
        difficulty: mockRecipe.difficulty,
        cuisineType: mockRecipe.cuisineType,
        tags: mockRecipe.tags,
      }

      const result = await caller.recipe.create(input)
      expect(result).toHaveProperty('id')
      expect(result.title).toBe(mockRecipe.title)
    })

    it('validates required fields', async () => {
      type Input = inferProcedureInput<AppRouter['recipe']['create']>
      const input = {} as Input

      await expect(caller.recipe.create(input)).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('updates an existing recipe', async () => {
      type Input = inferProcedureInput<AppRouter['recipe']['update']>
      const input: Input = {
        id: mockRecipe.id,
        title: 'Updated Recipe',
        ingredients: mockRecipe.ingredients,
        instructions: mockRecipe.instructions,
      }

      const result = await caller.recipe.update(input)
      expect(result.title).toBe('Updated Recipe')
    })

    it('handles non-existent recipes', async () => {
      type Input = inferProcedureInput<AppRouter['recipe']['update']>
      const input: Input = {
        id: 'non-existent',
        title: 'Updated Recipe',
      }

      await expect(caller.recipe.update(input)).rejects.toThrow('Recipe not found')
    })
  })

  describe('delete', () => {
    it('deletes an existing recipe', async () => {
      const result = await caller.recipe.delete({ id: mockRecipe.id })
      expect(result).toHaveProperty('id', mockRecipe.id)
    })

    it('handles non-existent recipes', async () => {
      await expect(caller.recipe.delete({ id: 'non-existent' })).rejects.toThrow('Recipe not found')
    })
  })

  describe('recordCooking', () => {
    it('records cooking session', async () => {
      const input = {
        recipeId: mockRecipe.id,
        rating: 5,
        notes: 'Great recipe!',
        actualTime: 45,
        servingsCooked: 4,
      }

      const result = await caller.recipe.recordCooking(input)
      expect(result).toHaveProperty('id')
      expect(result.rating).toBe(5)
    })

    it('validates rating range', async () => {
      const input = {
        recipeId: mockRecipe.id,
        rating: 6, // Invalid rating
        notes: 'Great recipe!',
      }

      await expect(caller.recipe.recordCooking(input)).rejects.toThrow(
        'Rating must be between 1 and 5'
      )
    })
  })

  describe('getCookingHistory', () => {
    it('returns cooking history for a recipe', async () => {
      const result = await caller.recipe.getCookingHistory(mockRecipe.id)
      expect(Array.isArray(result)).toBe(true)
    })

    it('handles non-existent recipes', async () => {
      await expect(caller.recipe.getCookingHistory('non-existent')).rejects.toThrow(
        'Recipe not found'
      )
    })
  })

  describe('analyzeTimers', () => {
    it('suggests timers for a recipe', async () => {
      const result = await caller.recipe.analyzeTimers({ recipeId: mockRecipe.id })
      expect(Array.isArray(result)).toBe(true)
    })

    it('handles AI service errors', async () => {
      // Mock AI service error
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('AI Error'))

      await expect(caller.recipe.analyzeTimers({ recipeId: mockRecipe.id })).rejects.toThrow(
        'Failed to analyze timers'
      )
    })
  })
})
