import { type GenerateImageParams, type GenerateImageResult } from './ai';
import { getPromptForModel, createImagePrompt } from './prompts';

const STABILITY_API_URL = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image";

interface GenerationResponse {
  artifacts: Array<{
    base64: string
    seed: number
    finishReason: string
  }>
}

export async function generateRecipeImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return {
      imageUrl: '',
      error: 'Stability API key is not configured',
    };
  }

  try {
    console.log('Starting image generation for recipe:', params.title);

    // Get the prompt configuration
    const promptConfig = getPromptForModel('imageGeneration', 'stability');
    const basePrompt = createImagePrompt(params);

    // Create the full prompt using the system specifications
    const prompt = `${basePrompt}. ${promptConfig.system}`;
    const negativePrompt = promptConfig.examples?.negative ?? "text, watermark, label, collage, low quality, blurry, oversaturated";

    console.log('Sending request to StabilityAI with prompt:', prompt);

    const response = await fetch(STABILITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: prompt,
            weight: 1
          },
          {
            text: negativePrompt,
            weight: -1
          }
        ],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        steps: 30,
        samples: 1,
        style_preset: "photographic"
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error from StabilityAI:', error);
      return {
        imageUrl: '',
        error: `Non-200 response: ${error}`,
      };
    }

    const responseJSON = await response.json() as GenerationResponse;
    
    if (!responseJSON.artifacts?.[0]) {
      return {
        imageUrl: '',
        error: 'No image generated',
      };
    }

    const imageUrl = `data:image/png;base64,${responseJSON.artifacts[0].base64}`;
    console.log('Got image from StabilityAI');
    return { imageUrl };

  } catch (error) {
    console.error('Error in generateImage:', error);
    return {
      imageUrl: '',
      error: 'Failed to generate image',
    };
  }
}

// TODO: Add Grok2 integration for recipe generation
export async function getRecipeSuggestions(title: string) {
  // Current Claude implementation
  // Will be replaced with Grok2 in the future
  return {
    ingredients: [],
    instructions: [],
    prepTime: 0,
    cookTime: 0,
    difficulty: "Easy" as const,
    cuisineType: "",
    tags: [],
  };
} 