import { type RecipeIngredient } from "@/types/recipe";
import { type AIModel } from "./ai";

export interface PromptConfig {
  system: string;
  examples?: Record<string, any>;
  format?: Record<string, any>;
}

export const prompts = {
  recipeGeneration: {
    system: `You are a professional chef suggesting a recipe. Create a recipe in the following JSON format:
{
  "ingredients": [{"name": "ingredient", "amount": number, "unit": "unit"}],
  "instructions": ["step 1", "step 2", ...],
  "prepTime": number,
  "cookTime": number,
  "difficulty": "Easy" | "Medium" | "Hard",
  "cuisineType": "cuisine type",
  "tags": ["tag1", "tag2", ...]
}

Important rules:
1. Use ONLY metric units:
   - Use "g" for solid ingredients (not "grams" or "gram")
   - Use "ml" for liquid ingredients (not "milliliters" or "milliliter")
   - Use "kg" for large amounts (1000g or more)
   - Use "l" for large liquid amounts (1000ml or more)
   - Use "tsp" or "tbsp" only for very small amounts where precision isn't critical
   - Temperature should be in Celsius
2. Use decimal numbers for amounts (e.g., 0.25 instead of 1/4, 0.5 instead of 1/2)
3. Round amounts to reasonable numbers (e.g., 250g instead of 247g)
4. Standardize units (e.g., use "g" not "gr" or "gram")

Respond with ONLY the JSON - no explanations or additional text.`,
    format: {
      ingredients: [{ name: "string", amount: "number", unit: "string" }],
      instructions: ["string"],
      prepTime: "number",
      cookTime: "number",
      difficulty: ["Easy", "Medium", "Hard"],
      cuisineType: "string",
      tags: ["string"],
    },
  },

  recipeImprovement: {
    system: `You are a professional chef helping to improve recipes. Analyze the recipe and provide improvements in the following JSON format:
{
  "improvedSteps": ["step 1", "step 2", ...],
  "summary": "Brief summary of improvements",
  "tips": ["tip 1", "tip 2", ...]
}

Respond with ONLY the JSON - no explanations or additional text.`,
    format: {
      improvedSteps: ["string"],
      summary: "string",
      tips: ["string"],
    },
  },

  imageGeneration: {
    system: `Create a professional food photograph with the following specifications:
- Overhead shot
- Soft natural lighting from the left
- Shallow depth of field
- Rustic wooden table or marble surface
- Professional food styling
- High-end restaurant presentation
- Beautiful garnishing
- Steam visible only if appropriate
- Never list ingredients in the image
- No text, watermark, label, or collage
- High quality, sharp, well-balanced colors`,
    format: {
      positive: "string", // Main prompt
      negative: "string", // Negative prompt for things to avoid
    },
    examples: {
      positive: "Professional food photograph of pasta with pesto sauce. Overhead shot, soft natural lighting from the left, shallow depth of field, on a rustic wooden table, garnished with fresh basil and pine nuts, steam rising gently, professional food styling, high-end restaurant presentation.",
      negative: "text, watermark, label, collage, low quality, blurry, oversaturated",
    },
  },
};

export function createRecipePrompt(title: string): string {
  return `Create a recipe for: ${title}`;
}

export function createImprovementPrompt(recipe: string): string {
  return `Analyze and improve this recipe: ${recipe}`;
}

export function createImagePrompt(recipe: {
  title: string;
  ingredients: RecipeIngredient[];
  cuisineType?: string;
}): string {
  const ingredientNames = recipe.ingredients.map(i => i.name);
  return `Professional food photograph of ${recipe.title}. ${recipe.cuisineType ? `This is a ${recipe.cuisineType} dish. ` : ''}The dish contains ${ingredientNames.join(', ')}.`;
}

export function getPromptForModel(
  promptType: keyof typeof prompts,
  model: AIModel
): PromptConfig {
  const basePrompt = prompts[promptType];
  
  // Model-specific adjustments
  switch (model) {
    case 'claude':
      return basePrompt;
    case 'openai':
      return {
        ...basePrompt,
        system: basePrompt.system.replace(/JSON/g, 'JSON object'), // OpenAI prefers more explicit language
      };
    case 'xai':
      return {
        ...basePrompt,
        system: basePrompt.system.replace(/Respond with ONLY/g, 'Return ONLY'), // xAI prefers different wording
      };
    case 'stability':
      if (promptType === 'imageGeneration') {
        // Stability works better with more concise prompts
        return {
          ...basePrompt,
          system: basePrompt.system
            .replace(/\n/g, ' ') // Remove newlines
            .replace(/- /g, '') // Remove bullet points
            .trim(),
        };
      }
      return basePrompt;
    default:
      return basePrompt;
  }
} 