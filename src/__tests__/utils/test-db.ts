import { type Recipe } from '@/types/recipe'

// Mock Prisma client for testing
const prisma = {
  cookingHistory: {
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
  recipe: {
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
  user: {
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
  $disconnect: jest.fn(),
}

export async function setupTestDb() {
  // Clean up existing data
  await prisma.cookingHistory.deleteMany()
  await prisma.recipe.deleteMany()
  await prisma.user.deleteMany()
}

export async function seedTestDb(recipes: Recipe[]) {
  // Create test user
  const user = await prisma.user.create({
    data: {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
    },
  })

  // Create recipes
  for (const recipe of recipes) {
    await prisma.recipe.create({
      data: {
        ...recipe,
        userId: user.id,
      },
    })
  }

  return { user }
}

export async function cleanupTestDb() {
  await prisma.cookingHistory.deleteMany()
  await prisma.recipe.deleteMany()
  await prisma.user.deleteMany()
  await prisma.$disconnect()
}

export async function createTestRecipe(data: Partial<Recipe> = {}) {
  const defaultRecipe: Recipe = {
    id: 'test-recipe',
    title: 'Test Recipe',
    ingredients: JSON.stringify([{ name: 'Test Ingredient', amount: 1, unit: 'cup' }]),
    instructions: JSON.stringify(['Test Step 1', 'Test Step 2']),
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    difficulty: 'Medium',
    cuisineType: 'Test',
    tags: ['test'],
    imageUrl: null,
    nutrition: null,
    timers: JSON.stringify([]),
    userId: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  }

  return await prisma.recipe.create({
    data: defaultRecipe,
  })
}

export interface CookingHistoryInput {
  recipeId: string
  userId?: string
  startedAt?: Date
  completedAt?: Date | null
  rating?: number | null
  notes?: string | null
}

export async function createTestCookingHistory(recipeId: string, data: CookingHistoryInput = {}) {
  return await prisma.cookingHistory.create({
    data: {
      recipeId,
      userId: data.userId || 'test-user',
      startedAt: data.startedAt || new Date(),
      completedAt: data.completedAt || new Date(),
      rating: data.rating || 5,
      notes: data.notes || 'Test notes',
    },
  })
}

export function generateMockRecipes(count: number): Recipe[] {
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
      Array.from({ length: 15 }, (_, j) => `Step ${j + 1}: Do something with ingredient ${j % 10}`)
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
