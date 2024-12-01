import { type Recipe as PrismaRecipe } from "@prisma/client";

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Ingredient extends RecipeIngredient {}

export interface Recipe extends Omit<PrismaRecipe, 'timers'> {
  cookingHistory?: CookingHistory[];
  timers?: RecipeTimer[] | string | null;
}

export interface CookingHistory {
  id: string;
  recipeId: string;
  recipe: Recipe;
  startedAt: Date;
  completedAt: Date | null;
  currentStep: number;
  actualTime: number | null;
  servingsCooked: number | null;
  notes: string | null;
  stepFeedback: string | null;
  createdAt: Date;
}

export interface RecipeImprovement {
  improvedSteps: string[];
  summary: string;
  tips: string[];
}

export interface RecipeSuggestion {
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  instructions: string[];
  prepTime: number;
  cookTime: number;
  difficulty: "Easy" | "Medium" | "Hard";
  cuisineType: string;
  tags: string[];
  timers?: Record<string, number>;
}

export interface RecipeTimer {
  id: string;
  name: string;
  duration: number; // in seconds
  stepIndex: number;
  description?: string;
  category?: string;
}

export interface TimerTemplate {
  id: string;
  name: string;
  duration: number;
  description?: string;
  category: string;
}

export interface TimerSuggestion {
  name: string;
  duration: number;
  stepIndex: number;
  description?: string;
  category?: string;
} 