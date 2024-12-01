import { type RecipeIngredient } from "@/types/recipe";

// Common interfaces for AI services
export interface GenerateImageParams {
  title: string;
  ingredients: RecipeIngredient[];
  cuisineType?: string;
}

export interface GenerateImageResult {
  imageUrl: string;
  error?: string;
}

export interface RecipeRequirements {
  servings: number;
  dietaryRestrictions: string[];
  preferences: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export interface GenerateRecipeParams {
  title: string;
  isImprovement?: boolean;
  requirements?: RecipeRequirements;
}

export interface RecipeSuggestion {
  ingredients: RecipeIngredient[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  difficulty: "Easy" | "Medium" | "Hard";
  cuisineType: string;
  tags: string[];
}

export interface RecipeImprovement {
  improvedSteps: string[];
  summary: string;
  tips: string[];
}

// AI Service type definitions
export type AIModel = 'claude' | 'openai' | 'xai' | 'stability';
export type ImageService = 'stability' | 'openai' | 'xai';
export type RecipeService = 'openai' | 'claude' | 'xai';

// Import implementations
import { generateRecipeImage as generateStabilityImage } from './stability';
import { generateRecipeImage as generateOpenAIImage } from './openai';
import { generateRecipeImage as generateXAIImage } from './xai';
import { getRecipeSuggestions as getOpenAISuggestions } from './openai';
import { getRecipeSuggestions as getClaudeSuggestions } from './claude';
import { getRecipeSuggestions as getXAISuggestions } from './xai';

// Configure which services to use
const IMAGE_SERVICE: ImageService = 'stability';
const RECIPE_SERVICE: RecipeService = 'claude';

// Export unified functions
export async function generateRecipeImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  switch (IMAGE_SERVICE) {
    case 'stability':
      return generateStabilityImage(params);
    case 'openai':
      return generateOpenAIImage(params);
    case 'xai':
      return generateXAIImage(params);
    default:
      return {
        imageUrl: '',
        error: `Unknown image service: ${IMAGE_SERVICE}`,
      };
  }
}

export async function getRecipeSuggestions(
  title: string,
  isImprovement = false,
  requirements?: RecipeRequirements
): Promise<RecipeSuggestion | RecipeImprovement> {
  switch (RECIPE_SERVICE) {
    case 'openai':
      return getOpenAISuggestions(title, requirements);
    case 'claude':
      return getClaudeSuggestions(title, isImprovement, requirements);
    case 'xai':
      return getXAISuggestions(title, requirements);
    default:
      return {
        ingredients: [],
        instructions: [],
        prepTime: 0,
        cookTime: 0,
        difficulty: requirements?.difficulty || "Easy",
        cuisineType: "",
        tags: [],
      };
  }
} 