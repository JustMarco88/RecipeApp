import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface RecipeSuggestion {
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  instructions: string[];
  prepTime: number;
  cookTime: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cuisineType: string;
  tags: string[];
}

export interface RecipeImprovement {
  improvedSteps: string[];
  summary: string;
  tips: string[];
}

export async function getRecipeSuggestions(prompt: string, isImprovement = false): Promise<RecipeSuggestion | RecipeImprovement> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    if (!response.content?.[0] || !('text' in response.content[0])) {
      throw new Error('Invalid response format from Claude');
    }

    const responseText = response.content[0].text;
    console.log('Raw response was:', responseText);

    // Clean up the response text
    const cleanedResponse = responseText
      .replace(/\n/g, ' ')  // Replace newlines with spaces
      .replace(/\\n/g, ' ') // Replace escaped newlines
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/([{,])\s*"(\w+)":\s*"([^"]*?)"\s*([},])/g, '$1"$2":"$3"$4') // Clean up JSON formatting

    try {
      // Parse the cleaned response
      const parsed = JSON.parse(cleanedResponse);
      
      if (isImprovement) {
        // Validate improvement response
        if (!parsed.improvedSteps || !Array.isArray(parsed.improvedSteps) ||
            !parsed.summary || typeof parsed.summary !== 'string' ||
            !parsed.tips || !Array.isArray(parsed.tips)) {
          throw new Error('Invalid improvement response format');
        }
        return parsed as RecipeImprovement;
      } else {
        // Validate recipe suggestion response
        if (!Array.isArray(parsed.ingredients) || !Array.isArray(parsed.instructions) || 
            typeof parsed.prepTime !== 'number' || typeof parsed.cookTime !== 'number' ||
            !['Easy', 'Medium', 'Hard'].includes(parsed.difficulty)) {
          throw new Error('Invalid recipe suggestion format');
        }
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
  const prompt = `You are a professional food photographer and stylist. Create a detailed image prompt for a beautiful, appetizing photo of this recipe.
  
  Recipe: "${recipe.title}"
  Main ingredients: ${recipe.ingredients.map(i => i.name).join(', ')}
  ${recipe.cuisineType ? `Cuisine type: ${recipe.cuisineType}` : ''}

  Respond with ONLY the image prompt - no explanations, no additional text.
  The prompt should:
  - Describe a professional food photography setup
  - Include lighting details (soft, natural lighting preferred)
  - Mention plating and garnish details
  - Include background/setting suggestions
  - Be specific about angle and composition
  - Be 2-3 sentences maximum
  
  Example format (do not use this exact text):
  "A rustic wooden table with soft natural light streaming from the left, showcasing a perfectly plated pasta dish with fresh herbs scattered artfully. The shallow depth of field focuses on the steam rising from the perfectly cooked noodles."`;

  try {
    console.log('Generating image prompt for recipe:', recipe.title);
    
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
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