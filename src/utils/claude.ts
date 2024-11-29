import Anthropic from '@anthropic-ai/sdk';
import { type RecipeSuggestion, type RecipeImprovement } from './ai';
import { getPromptForModel, createRecipePrompt, createImprovementPrompt, createImagePrompt } from './prompts';
import { type Ingredient } from '@/types/recipe';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function getRecipeSuggestions(prompt: string, isImprovement = false): Promise<RecipeSuggestion | RecipeImprovement> {
  try {
    const promptConfig = getPromptForModel(
      isImprovement ? 'recipeImprovement' : 'recipeGeneration',
      'claude'
    );

    const userPrompt = isImprovement 
      ? createImprovementPrompt(prompt)
      : createRecipePrompt(prompt);

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      temperature: 0.7,
      system: promptConfig.system,
      messages: [{ role: "user", content: userPrompt }],
    });

    if (!response.content?.[0] || !('text' in response.content[0])) {
      throw new Error('Invalid response format from Claude');
    }

    const responseText = response.content[0].text.trim();
    console.log('Raw response was:', responseText);

    try {
      // Clean up any potential fraction values
      const cleanedResponse = responseText.replace(
        /"amount":\s*(\d+)\/(\d+)/g, 
        (_, numerator, denominator) => `"amount": ${Number(numerator) / Number(denominator)}`
      );

      const parsed = JSON.parse(cleanedResponse);
      
      if (isImprovement) {
        if (!parsed.improvedSteps || !Array.isArray(parsed.improvedSteps) ||
            !parsed.summary || typeof parsed.summary !== 'string' ||
            !parsed.tips || !Array.isArray(parsed.tips)) {
          throw new Error('Invalid improvement response format');
        }
        return parsed as RecipeImprovement;
      } else {
        if (!Array.isArray(parsed.ingredients) || !Array.isArray(parsed.instructions) || 
            typeof parsed.prepTime !== 'number' || typeof parsed.cookTime !== 'number' ||
            !['Easy', 'Medium', 'Hard'].includes(parsed.difficulty)) {
          throw new Error('Invalid recipe suggestion format');
        }

        // Validate and standardize units
        parsed.ingredients = parsed.ingredients.map((ing: Ingredient) => ({
          ...ing,
          unit: standardizeUnit(ing.unit),
          amount: roundToReasonableNumber(ing.amount, ing.unit)
        }));

        return parsed as RecipeSuggestion;
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response. Error:', parseError);
      console.error('Raw response was:', responseText);
      throw new Error('Failed to parse Claude response as JSON');
    }
  } catch (error) {
    console.error('Error in getRecipeSuggestions:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to get recipe suggestions: ${error.message}`);
    }
    throw new Error('Failed to get recipe suggestions: Unknown error');
  }
}

export async function generateRecipeImagePrompt(recipe: {
  title: string;
  ingredients: Array<{ name: string }>;
  cuisineType?: string;
}): Promise<string> {
  try {
    const promptConfig = getPromptForModel('imageGeneration', 'claude');
    const userPrompt = createImagePrompt(recipe);
    
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      temperature: 0.7,
      system: promptConfig.system,
      messages: [{ role: 'user', content: userPrompt }],
    });

    if (!message.content?.[0] || !('text' in message.content[0])) {
      throw new Error('Invalid response format from Claude');
    }

    console.log('Generated image prompt:', message.content[0].text);
    return message.content[0].text.trim();
  } catch (error) {
    console.error('Error generating image prompt:', error);
    throw new Error('Failed to generate image prompt');
  }
}

function standardizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    'gram': 'g',
    'grams': 'g',
    'gr': 'g',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'millilitre': 'ml',
    'millilitres': 'ml',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'liter': 'l',
    'liters': 'l',
    'litre': 'l',
    'litres': 'l',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
  };

  const standardized = unitMap[unit.toLowerCase()];
  return standardized || unit;
}

function roundToReasonableNumber(amount: number, unit: string): number {
  // Round to reasonable numbers based on unit and amount
  if (unit === 'g' || unit === 'ml') {
    if (amount >= 1000) {
      return Math.round(amount / 1000) * 1000;
    } else if (amount >= 100) {
      return Math.round(amount / 50) * 50;
    } else if (amount >= 10) {
      return Math.round(amount / 5) * 5;
    }
    return Math.round(amount);
  }
  
  // For small measurements like tsp/tbsp, round to quarter units
  if (unit === 'tsp' || unit === 'tbsp') {
    return Math.round(amount * 4) / 4;
  }

  return amount;
} 