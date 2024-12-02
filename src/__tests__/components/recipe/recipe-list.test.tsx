import React from 'react'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/test-utils'
import { type Recipe } from '@/types/recipe'
import { RecipeList } from '@/components/recipe/recipe-list'

// Mock recipe data
const mockRecipes: Recipe[] = [
  {
    id: '1',
    title: 'Test Recipe 1',
    ingredients: JSON.stringify(['ingredient 1', 'ingredient 2']),
    instructions: JSON.stringify(['step 1', 'step 2']),
    prepTime: 30,
    cookTime: 45,
    servings: 4,
    difficulty: 'Medium',
    cuisineType: 'Italian',
    tags: ['pasta', 'dinner'],
    imageUrl: null,
    nutrition: null,
    timers: JSON.stringify([]),
    userId: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Test Recipe 2',
    ingredients: JSON.stringify(['ingredient 3', 'ingredient 4']),
    instructions: JSON.stringify(['step 3', 'step 4']),
    prepTime: 15,
    cookTime: 20,
    servings: 2,
    difficulty: 'Easy',
    cuisineType: 'Mexican',
    tags: ['quick', 'lunch'],
    imageUrl: null,
    nutrition: null,
    timers: JSON.stringify([]),
    userId: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// Mock the trpc hooks
jest.mock('@/utils/api', () => ({
  api: {
    recipe: {
      getAll: {
        useQuery: () => ({
          data: mockRecipes,
          isLoading: false,
          error: null,
          isError: false,
        }),
      },
      delete: {
        useMutation: () => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
    },
  },
}))

describe('RecipeList', () => {
  describe('Loading State', () => {
    it('shows loading state', async () => {
      renderWithProviders(<RecipeList />)
      expect(screen.getByText('Loading recipes...')).toBeInTheDocument()
    })
  })

  describe('Loaded State', () => {
    it('shows the header', async () => {
      renderWithProviders(<RecipeList />)
      expect(screen.getByText('My Recipes')).toBeInTheDocument()
    })

    it('shows the new recipe button', async () => {
      renderWithProviders(<RecipeList />)
      expect(screen.getByText('New Recipe')).toBeInTheDocument()
    })

    it('shows recipe cards', async () => {
      renderWithProviders(<RecipeList />)
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument()
      expect(screen.getByText('Test Recipe 2')).toBeInTheDocument()
    })

    it('shows recipe tags', async () => {
      renderWithProviders(<RecipeList />)
      expect(screen.getByText('pasta')).toBeInTheDocument()
      expect(screen.getByText('dinner')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('opens recipe wizard on new recipe click', async () => {
      const { user } = renderWithProviders(<RecipeList />)
      await user.click(screen.getByText('New Recipe'))
      expect(screen.getByText('Create New Recipe')).toBeInTheDocument()
    })

    it('filters recipes by search query', async () => {
      const { user } = renderWithProviders(<RecipeList />)
      const searchInput = screen.getByPlaceholderText('Search recipes...')
      await user.type(searchInput, 'pasta')
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument()
      expect(screen.queryByText('Test Recipe 2')).not.toBeInTheDocument()
    })

    it('sorts recipes by recently cooked', async () => {
      const { user } = renderWithProviders(<RecipeList />)
      const sortSelect = screen.getByLabelText('Sort recipes')
      await user.selectOptions(sortSelect, 'Recently Cooked')
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument()
    })

    it('handles recipe deletion', async () => {
      const { user } = renderWithProviders(<RecipeList />)
      await user.click(screen.getByLabelText('Delete Recipe 1'))
      expect(screen.getByText('Delete Recipe?')).toBeInTheDocument()
      await user.click(screen.getByText('Confirm'))
      expect(screen.queryByText('Test Recipe 1')).not.toBeInTheDocument()
    })

    it('starts cooking session', async () => {
      const { user } = renderWithProviders(<RecipeList />)
      await user.click(screen.getByLabelText('Cook Recipe 1'))
      expect(screen.getByText('Step 1: Do something')).toBeInTheDocument()
    })
  })

  describe('Error States', () => {
    it('shows error message', async () => {
      // Mock API error
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Failed to fetch'))
      renderWithProviders(<RecipeList />)
      expect(screen.getByText('Error loading recipes')).toBeInTheDocument()
    })

    it('handles empty state', async () => {
      // Mock empty recipe list
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({ recipes: [] })
      renderWithProviders(<RecipeList />)
      expect(screen.getByText('No recipes found')).toBeInTheDocument()
    })
  })
})
