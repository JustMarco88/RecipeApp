import OpenAI from 'openai';
import { type GenerateImageParams, type GenerateImageResult, type RecipeSuggestion, type RecipeImprovement } from './ai';
import { getPromptForModel, createRecipePrompt, createImprovementPrompt, createImagePrompt } from './prompts';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateRecipeImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  try {
    const promptConfig = getPromptForModel('imageGeneration', 'openai');
    const basePrompt = createImagePrompt(params);
    const prompt = `${basePrompt}. ${promptConfig.system}`;

    console.log('Sending request to DALL-E with prompt:', prompt);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "natural",
    });

    if (!response.data?.[0]?.url) {
      console.error('Unexpected API response structure:', response);
      return {
        imageUrl: '',
        error: 'Invalid response format from API',
      };
    }

    return { imageUrl: response.data[0].url };

  } catch (error) {
    console.error('Error generating recipe image:', error);
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
      'openai'
    );

    const userPrompt = isImprovement 
      ? createImprovementPrompt(title)
      : createRecipePrompt(title);

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: promptConfig.system },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    if (!response.choices[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI');
    }

    const result = JSON.parse(response.choices[0].message.content);

    if (isImprovement) {
      if (!result.improvedSteps || !Array.isArray(result.improvedSteps) ||
          !result.summary || typeof result.summary !== 'string' ||
          !result.tips || !Array.isArray(result.tips)) {
        throw new Error('Invalid improvement response format');
      }
      return result as RecipeImprovement;
    } else {
      if (!Array.isArray(result.ingredients) || !Array.isArray(result.instructions) || 
          typeof result.prepTime !== 'number' || typeof result.cookTime !== 'number' ||
          !['Easy', 'Medium', 'Hard'].includes(result.difficulty)) {
        throw new Error('Invalid recipe suggestion format');
      }
      return result as RecipeSuggestion;
    }

  } catch (error) {
    console.error('Error getting recipe suggestions:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get recipe suggestions');
  }
} 