export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Ingredient extends RecipeIngredient {}

export interface Recipe {
  id: string;
  title: string;
  ingredients: string; // JSON string of Ingredient[]
  instructions: string; // JSON string of string[]
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cuisineType?: string | null;
  tags: string[];
  imageUrl?: string | null;
  nutrition?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId?: string | null;
  tips?: string | null;
}

export interface CookingHistory {
  id: string;
  recipeId: string;
  startedAt: Date;
  completedAt: Date | null;
  currentStep: number;
  actualTime: number | null;
  servingsCooked: number | null;
  notes: string | null;
  ingredients: string | null;
  instructions: string | null;
  createdAt: Date;
}

export interface RecipeWithHistory extends Recipe {
  cookingHistory?: CookingHistory[];
}

export interface RecipeImprovement {
  improvedSteps: string[];
  summary: string;
  tips: string[];
} 