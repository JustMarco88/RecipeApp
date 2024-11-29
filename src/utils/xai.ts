import OpenAI from 'openai';
import { type GenerateImageParams, type GenerateImageResult, type RecipeSuggestion, type RecipeImprovement } from './ai';
import { getPromptForModel, createRecipePrompt, createImprovementPrompt, createImagePrompt } from './prompts';

if (!process.env.XAI_API_KEY) {
  throw new Error('XAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1'
});

export async function generateRecipeImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  try {
    const promptConfig = getPromptForModel('imageGeneration', 'xai');
    const basePrompt = createImagePrompt(params);
    const prompt = `${basePrompt}. ${promptConfig.system}`;

    // Note: xAI currently doesn't support image generation
    // Returning error until they add support
    return {
      imageUrl: '',
      error: 'Image generation not yet supported by xAI',
    };
  } catch (error) {
    console.error('Error in xAI image generation:', error);
    return {
      imageUrl: '',
      error: error instanceof Error ? error.message : 'Failed to generate image',
    };
  }
}

export async function getRecipeSuggestions(title: string, isImprovement = false): Promise<RecipeSuggestion | RecipeImprovement> {
  try {
    const promptConfig = getPromptForModel(
      isImprovement ? 'recipeImprovement' : 'recipeGeneration',
      'xai'
    );

    const userPrompt = isImprovement 
      ? createImprovementPrompt(title)
      : createRecipePrompt(title);

    const completion = await openai.chat.completions.create({
      model: 'grok-1',  // Using grok-1 as it's their current model
      temperature: 0.7,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: promptConfig.system
        },
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Invalid response format from xAI');
    }

    const parsed = JSON.parse(content);
    
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
      return parsed as RecipeSuggestion;
    }

  } catch (error) {
    console.error('Error in xAI recipe generation:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate recipe');
  }
} 