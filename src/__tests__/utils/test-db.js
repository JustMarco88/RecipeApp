// Mock Prisma client for testing
const mockFn = () => {
  const fn = (...args) => {
    fn.mock.calls.push(args)
    return fn.mock.results[fn.mock.calls.length - 1]?.value
  }
  fn.mock = {
    calls: [],
    results: [],
    instances: [],
  }
  fn.mockReturnValue = value => {
    fn.mock.results.push({ type: 'return', value })
    return fn
  }
  fn.mockImplementation = impl => {
    fn.mock.results.push({ type: 'return', value: impl() })
    return fn
  }
  fn.mockReset = () => {
    fn.mock.calls = []
    fn.mock.results = []
    fn.mock.instances = []
  }
  return fn
}

const prisma = {
  cookingHistory: {
    deleteMany: mockFn(),
    create: mockFn(),
  },
  recipe: {
    deleteMany: mockFn(),
    create: mockFn(),
  },
  user: {
    deleteMany: mockFn(),
    create: mockFn(),
  },
  $disconnect: mockFn(),
}

async function setupTestDb() {
  // Clean up existing data
  await prisma.cookingHistory.deleteMany()
  await prisma.recipe.deleteMany()
  await prisma.user.deleteMany()
}

async function seedTestDb(recipes) {
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

async function cleanupTestDb() {
  await prisma.cookingHistory.deleteMany()
  await prisma.recipe.deleteMany()
  await prisma.user.deleteMany()
  await prisma.$disconnect()
}

async function createTestRecipe(data = {}) {
  const defaultRecipe = {
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

async function createTestCookingHistory(recipeId, data = {}) {
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

function generateMockRecipes(count) {
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

module.exports = {
  setupTestDb,
  seedTestDb,
  cleanupTestDb,
  createTestRecipe,
  createTestCookingHistory,
  generateMockRecipes,
}
