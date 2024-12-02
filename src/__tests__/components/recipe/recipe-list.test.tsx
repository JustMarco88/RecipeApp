import { screen, waitFor } from '@testing-library/react'
import { RecipeList } from '@/components/recipe/recipe-list'
import { renderWithProviders } from '../../utils/test-utils'
import { type Recipe } from '@/types/recipe'

const mockRecipes: Recipe[] = [
  {
    id: '1',
    name: 'Test Recipe 1',
    ingredients: ['ingredient 1', 'ingredient 2'],
    instructions: ['step 1', 'step 2'],
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user1',
    servings: 4,
    prepTime: 30,
    cookTime: 45,
    totalTime: 75,
    difficulty: 'medium',
    cuisine: 'Italian',
    tags: ['pasta', 'dinner'],
    notes: 'Test notes',
    imageUrl: null,
    isPublic: false,
    rating: 4,
  },
  {
    id: '2',
    name: 'Test Recipe 2',
    ingredients: ['ingredient 3', 'ingredient 4'],
    instructions: ['step 3', 'step 4'],
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user1',
    servings: 2,
    prepTime: 15,
    cookTime: 20,
    totalTime: 35,
    difficulty: 'easy',
    cuisine: 'Mexican',
    tags: ['quick', 'lunch'],
    notes: 'More test notes',
    imageUrl: null,
    isPublic: false,
    rating: 5,
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
      const { expectToBeInDocument } = renderWithProviders(<RecipeList />)
      await expectToBeInDocument('Loading recipes...')
    })
  })

  describe('Loaded State', () => {
    it('shows the header', async () => {
      const { expectToBeInDocument } = renderWithProviders(<RecipeList />)
      await expectToBeInDocument('My Recipes')
    })

    it('shows the new recipe button', async () => {
      const { expectToBeInDocument } = renderWithProviders(<RecipeList />)
      await expectToBeInDocument('New Recipe')
    })

    it('shows recipe cards', async () => {
      const { expectToBeInDocument } = renderWithProviders(<RecipeList />)
      await expectToBeInDocument('Test Recipe 1')
      await expectToBeInDocument('Test Recipe 2')
    })

    it('shows recipe tags', async () => {
      const { expectToBeInDocument } = renderWithProviders(<RecipeList />)
      await expectToBeInDocument('pasta')
      await expectToBeInDocument('dinner')
    })
  })

  describe('Interactions', () => {
    it('opens recipe wizard on new recipe click', async () => {
      const { user, expectToBeInDocument } = renderWithProviders(<RecipeList />)

      await expectToBeInDocument('New Recipe')

      const newRecipeButton = screen.getByText('New Recipe')
      await user.click(newRecipeButton)

      await expectToBeInDocument('Create New Recipe')
    })

    it('shows recipe actions on hover', async () => {
      const { user } = renderWithProviders(<RecipeList />)

      await waitFor(() => {
        expect(screen.getByText('Test Recipe 1')).toBeInTheDocument()
      })

      // Find the first recipe card
      const recipeCard = screen.getByTestId('recipe-card-1')
      await user.hover(recipeCard)

      // Check if action buttons are visible
      expect(screen.getByTestId('edit-button-1')).toBeVisible()
      expect(screen.getByTestId('delete-button-1')).toBeVisible()
      expect(screen.getByTestId('cook-button-1')).toBeVisible()
    })
  })

  describe('Error State', () => {
    beforeEach(() => {
      // Mock the API to return an error
      jest.mock('@/utils/api', () => ({
        api: {
          recipe: {
            getAll: {
              useQuery: () => ({
                data: null,
                isLoading: false,
                error: new Error('Failed to fetch recipes'),
                isError: true,
              }),
            },
          },
        },
      }))
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('shows error message', async () => {
      const { expectToBeInDocument } = renderWithProviders(<RecipeList />)
      await expectToBeInDocument('No recipes found')
    })
  })
})
