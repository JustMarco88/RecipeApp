export interface RecipeIngredient {
  name: string
  amount: number
  unit: string
  checked?: boolean
}

export interface RecipeTimer {
  id: string
  name: string
  duration: number
  isActive: boolean
  remaining: number
  createdAt: Date
}

export interface Recipe {
  id: string
  title: string
  ingredients: string
  instructions: string
  prepTime: number
  cookTime: number
  servings: number
  difficulty: string
  cuisineType: string
  tags: string[]
  imageUrl: string | null
  nutrition: string | null
  timers: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface CookingHistory {
  id: string
  recipeId: string
  userId: string
  startedAt: Date
  completedAt: Date | null
  rating: number | null
  notes: string | null
  recipe: Recipe
}

export interface RecipeWithHistory extends Recipe {
  history: CookingHistory[]
  cookingHistory?: CookingHistory[]
}

export interface TimerInput {
  name: string
  duration: number
}

export interface TimerSuggestion {
  name: string
  duration: number
  stepIndex: number
  description?: string
  category?: string
}

export interface RecipeImprovement {
  improvedSteps: string[]
  summary: string
  tips: string[]
}

export interface RecipeSuggestion {
  ingredients: RecipeIngredient[]
  instructions: string[]
  prepTime: number
  cookTime: number
  difficulty: 'Easy' | 'Medium' | 'Hard'
  cuisineType: string
  tags: string[]
  timers?: Record<string, number>
}
