import { performance } from 'perf_hooks'
import { createInnerTRPCContext } from '@/server/api/trpc'
import { appRouter } from '@/server/api/root'
import { type Recipe } from '@/types/recipe'
import { logger } from '@/utils/logger'

const PERFORMANCE_THRESHOLD = {
  RECIPE_LOAD: 100, // ms
  RECIPE_SEARCH: 200, // ms
  RECIPE_SORT: 50, // ms
  TIMER_ANALYSIS: 2000, // ms
  COOKING_SESSION: 100, // ms
}

describe('Recipe Performance Tests', () => {
  const ctx = createInnerTRPCContext({ session: null })
  const caller = appRouter.createCaller(ctx)

  // Generate a large dataset
  const generateMockRecipes = (count: number): Recipe[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `recipe-${i}`,
      title: `Test Recipe ${i}`,
      ingredients: JSON.stringify(
        Array.from({ length: 10 }, (_, j) => ({
          name: `Ingredient ${j}`,
          amount: j + 1,
          unit: 'cup',
        }))
      ),
      instructions: JSON.stringify(
        Array.from(
          { length: 15 },
          (_, j) => `Step ${j + 1}: Do something with ingredient ${j % 10}`
        )
      ),
      prepTime: 10 + (i % 30),
      cookTime: 20 + (i % 45),
      servings: 2 + (i % 6),
      difficulty: ['Easy', 'Medium', 'Hard'][i % 3],
      cuisineType: ['Italian', 'Mexican', 'Chinese', 'Indian', 'French'][i % 5],
      tags: [`tag${i % 10}`, `category${i % 5}`],
      imageUrl: null,
      nutrition: null,
      timers: JSON.stringify([]),
      userId: 'test-user',
      createdAt: new Date(Date.now() - i * 86400000),
      updatedAt: new Date(),
    }))
  }

  const mockRecipes = generateMockRecipes(1000)

  beforeAll(async () => {
    // Seed the database with mock recipes
    for (const recipe of mockRecipes.slice(0, 100)) {
      // Insert first 100 recipes
      await caller.recipe.create({
        title: recipe.title,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        cuisineType: recipe.cuisineType,
        tags: recipe.tags,
      })
    }
  })

  describe('Recipe Loading Performance', () => {
    it('loads recipes within threshold', async () => {
      const start = performance.now()
      await caller.recipe.getAll()
      const duration = performance.now() - start

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.RECIPE_LOAD)
      logger.info('Recipe load performance', { duration })
    })

    it('handles pagination efficiently', async () => {
      const measurements: number[] = []

      for (let page = 0; page < 5; page++) {
        const start = performance.now()
        await caller.recipe.getAll({ page, limit: 20 })
        measurements.push(performance.now() - start)
      }

      const avgDuration = measurements.reduce((a, b) => a + b) / measurements.length
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLD.RECIPE_LOAD)
      logger.info('Pagination performance', { avgDuration, measurements })
    })
  })

  describe('Search Performance', () => {
    it('performs text search within threshold', async () => {
      const start = performance.now()
      await caller.recipe.search({ query: 'ingredient' })
      const duration = performance.now() - start

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.RECIPE_SEARCH)
      logger.info('Search performance', { duration })
    })

    it('handles complex filters efficiently', async () => {
      const start = performance.now()
      await caller.recipe.search({
        query: 'ingredient',
        filters: {
          difficulty: 'Medium',
          cuisineType: 'Italian',
          prepTimeMax: 30,
          tags: ['tag1'],
        },
      })
      const duration = performance.now() - start

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.RECIPE_SEARCH * 1.5) // Allow 50% more time for complex filters
      logger.info('Complex search performance', { duration })
    })
  })

  describe('Sorting Performance', () => {
    it('sorts recipes efficiently', async () => {
      const sortFields = ['createdAt', 'title', 'prepTime', 'cookTime'] as const
      const measurements: Record<string, number> = {}

      for (const field of sortFields) {
        const start = performance.now()
        await caller.recipe.getAll({ sortBy: field, sortOrder: 'desc' })
        measurements[field] = performance.now() - start
      }

      Object.values(measurements).forEach(duration => {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.RECIPE_SORT)
      })
      logger.info('Sort performance', { measurements })
    })
  })

  describe('Timer Analysis Performance', () => {
    it('analyzes recipe timers within threshold', async () => {
      const start = performance.now()
      await caller.recipe.analyzeTimers({ recipeId: mockRecipes[0].id })
      const duration = performance.now() - start

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.TIMER_ANALYSIS)
      logger.info('Timer analysis performance', { duration })
    })
  })

  describe('Cooking Session Performance', () => {
    it('handles concurrent timer updates efficiently', async () => {
      const recipe = mockRecipes[0]
      const session = await caller.recipe.startCooking({ recipeId: recipe.id })
      const timers = Array.from({ length: 5 }, (_, i) => ({
        id: `timer-${i}`,
        duration: 300,
        name: `Timer ${i}`,
      }))

      // Add multiple timers
      const start = performance.now()
      await Promise.all(
        timers.map(timer =>
          caller.recipe.addTimer({
            sessionId: session.id,
            ...timer,
          })
        )
      )
      const duration = performance.now() - start

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD.COOKING_SESSION)
      logger.info('Concurrent timer updates performance', { duration })
    })

    it('handles step transitions efficiently', async () => {
      const recipe = mockRecipes[0]
      const session = await caller.recipe.startCooking({ recipeId: recipe.id })
      const measurements: number[] = []

      // Measure performance of multiple step transitions
      for (let step = 0; step < 10; step++) {
        const start = performance.now()
        await caller.recipe.updateStep({
          sessionId: session.id,
          step,
        })
        measurements.push(performance.now() - start)
      }

      const avgDuration = measurements.reduce((a, b) => a + b) / measurements.length
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLD.COOKING_SESSION)
      logger.info('Step transition performance', { avgDuration, measurements })
    })
  })
})
