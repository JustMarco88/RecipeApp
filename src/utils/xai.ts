import { type RecipeIngredient } from "@/types/recipe"
import OpenAI from 'openai'

export interface ImageGenerationResponse {
  imageUrl: string
  error?: string
  errorType?: 'BILLING' | 'API' | 'UNKNOWN'
}

export async function generateRecipeImage(
  title: string,
  ingredients: RecipeIngredient[],
  cuisineType?: string
): Promise<ImageGenerationResponse> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        imageUrl: '',
        error: 'OpenAI API key is not configured',
        errorType: 'API'
      }
    }

    const openai = new OpenAI({
      apiKey,
    });

    const prompt = `Create a professional food photograph of ${title}. 
      ${cuisineType ? `This is a ${cuisineType} dish. ` : ''}
      The dish contains ${ingredients.map(ing => ing.name).join(', ')}.
      The image should be: Overhead shot, soft natural lighting from the left, shallow depth of field, on a rustic wooden table or marble surface, garnished beautifully, steam visible if appropriate, professional food styling, high-end restaurant presentation.`

    console.log('Sending request to DALL-E with prompt:', prompt);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "natural",
    });

    console.log('DALL-E API response:', JSON.stringify(response, null, 2));

    if (!response.data?.[0]?.url) {
      console.error('Unexpected API response structure:', response);
      return {
        imageUrl: '',
        error: 'Invalid response format from API',
        errorType: 'API'
      }
    }

    return { imageUrl: response.data[0].url }
  } catch (error) {
    console.error('Error generating recipe image:', error);
    
    // Check for billing errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('billing') || errorMessage.includes('quota')) {
        return {
          imageUrl: '',
          error: 'The AI image generation service is currently unavailable due to billing limits. Please try again later or upload an image manually.',
          errorType: 'BILLING'
        }
      }
      return {
        imageUrl: '',
        error: error.message,
        errorType: 'API'
      }
    }
    
    return {
      imageUrl: '',
      error: 'An unexpected error occurred while generating the image',
      errorType: 'UNKNOWN'
    }
  }
} 