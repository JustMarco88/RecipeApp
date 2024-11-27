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

export async function getRecipeSuggestions(title: string): Promise<RecipeSuggestion> {
  const prompt = `You are a professional chef and recipe expert. I need you to provide recipe details in JSON format.
  For the recipe title "${title}", respond with ONLY a JSON object - no markdown, no explanations, no additional text.

  The response must be a valid JSON object exactly matching this interface:
  {
    "ingredients": [
      {
        "name": "string",
        "amount": number,
        "unit": "string"
      }
    ],
    "instructions": ["string"],
    "prepTime": number,
    "cookTime": number,
    "difficulty": "Easy" | "Medium" | "Hard",
    "cuisineType": "string",
    "tags": ["string"]
  }

  Requirements:
  - Response must be a single, valid JSON object
  - No text before or after the JSON
  - All numbers must be numeric (not strings)
  - Ingredients must have precise measurements
  - Instructions should be clear, step-by-step array items
  - Times must be numbers in minutes
  - Difficulty must be exactly "Easy", "Medium", or "Hard"
  - Tags should be an array of relevant keywords

  Example format (do not use these values, just follow the structure):
  {
    "ingredients": [
      {
        "name": "all-purpose flour",
        "amount": 250,
        "unit": "g"
      }
    ],
    "instructions": [
      "Preheat oven to 180°C",
      "Mix ingredients in a bowl"
    ],
    "prepTime": 15,
    "cookTime": 30,
    "difficulty": "Easy",
    "cuisineType": "Italian",
    "tags": ["pasta", "dinner", "vegetarian"]
  }`;

  try {
    console.log('Sending request to Claude for recipe:', title);
    
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    console.log('Received response from Claude:', JSON.stringify(message, null, 2));

    if (!message.content || message.content.length === 0) {
      throw new Error('Empty response from Claude');
    }

    const content = message.content[0];
    console.log('Content block:', JSON.stringify(content, null, 2));

    if (content.type !== 'text') {
      console.error('Unexpected content type:', content.type);
      throw new Error('Unexpected response format from Claude');
    }

    const response = content.text;
    console.log('Raw response text:', response);

    try {
      // Try to clean the response if it contains any extra text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      const jsonStr = jsonMatch[0];
      console.log('Extracted JSON string:', jsonStr);

      const parsed = JSON.parse(jsonStr) as RecipeSuggestion;
      
      // Validate the parsed data
      if (!Array.isArray(parsed.ingredients) || !Array.isArray(parsed.instructions) || 
          typeof parsed.prepTime !== 'number' || typeof parsed.cookTime !== 'number' ||
          !['Easy', 'Medium', 'Hard'].includes(parsed.difficulty)) {
        throw new Error('Invalid data structure in response');
      }

      console.log('Successfully parsed response:', parsed);
      return parsed;
    } catch (parseError) {
      console.error('Failed to parse JSON response. Error:', parseError);
      console.error('Raw response was:', response);
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