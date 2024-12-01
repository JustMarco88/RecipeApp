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

  timerAnalysis: {
    openai: {
      system: `Analyze recipe instructions to identify steps that require timing. For each timing-related step:
1. Extract the explicit duration if mentioned
2. Infer reasonable durations for common cooking actions
3. Consider the context and ingredient quantities
4. Group similar timing actions into categories (e.g., boiling, baking, resting)
5. Provide clear, descriptive names for each timer

Format the response as a JSON array of timer suggestions:
{
  "timers": [
    {
      "name": "Boil Pasta",
      "duration": 480, // in seconds
      "stepIndex": 2,
      "description": "Cook pasta until al dente",
      "category": "boiling"
    }
  ]
}

Common cooking durations to consider:
- Boiling pasta: 8-10 minutes
- Sautéing vegetables: 5-7 minutes
- Resting meat: 5-15 minutes depending on size
- Rice cooking: 15-20 minutes
- Preheating oven: 10-15 minutes`,
      examples: {
        positive: [
          "Boil the pasta for 8-10 minutes until al dente",
          "Sauté onions until translucent, about 5 minutes",
          "Let the meat rest for 10 minutes before slicing"
        ],
        negative: [
          "Add salt and pepper to taste",
          "Stir until well combined",
          "Serve immediately"
        ]
      }
    },
    claude: {
      system: `As a culinary timing expert, analyze recipe instructions to identify and suggest appropriate timers. Consider:

1. Explicit timing instructions in the steps
2. Standard cooking durations for common techniques
3. Ingredient quantities and their impact on timing
4. The logical sequence and dependencies between steps
5. Opportunities for parallel timing

Provide timer suggestions that:
- Have clear, action-oriented names
- Include reasonable default durations
- Are linked to specific recipe steps
- Are categorized by cooking technique
- Include helpful descriptions

Format as JSON array of timer objects with name, duration (seconds), stepIndex, description, and category.`,
      examples: {
        positive: [
          "Simmer the sauce for 20 minutes until thickened",
          "Bake at 350°F for 25-30 minutes",
          "Marinate for at least 30 minutes"
        ],
        negative: [
          "Season to taste",
          "Mix until combined",
          "Garnish with herbs"
        ]
      }
    },
    xai: {
      system: `Analyze recipe steps for timing requirements. For each relevant step:
1. Extract or infer duration
2. Create descriptive timer name
3. Categorize the timing action
4. Link to specific step
5. Add helpful context

Return JSON array of timer objects with name, duration, stepIndex, description, and category.`,
      examples: {
        positive: [
          "Cook until golden brown, about 5 minutes",
          "Let dough rise for 1 hour",
          "Simmer for 15-20 minutes"
        ],
        negative: [
          "Stir to combine",
          "Add ingredients gradually",
          "Serve hot"
        ]
      }
    }
  }
};

export function createRecipePrompt(title: string): string {
  return `Create a detailed recipe for "${title}". Include:
1. List of ingredients with precise measurements
2. Step-by-step instructions
3. Preparation and cooking times
4. Difficulty level
5. Cuisine type
6. Dietary tags
7. Suggested timers for critical steps

Format the response as a JSON object with ingredients, instructions, prepTime, cookTime, difficulty, cuisineType, tags, and suggested timers.`;
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

export function createTimerAnalysisPrompt(recipe: { instructions: string }) {
  return {
    system: prompts.timerAnalysis.system,
    examples: prompts.timerAnalysis.examples,
    input: recipe.instructions
  };
} 