import '@testing-library/jest-dom'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/test-utils'
import { CookingView } from '@/components/recipe/cooking-view'
import { type Recipe } from '@/store/cookingStore'

// Mock recipe data
const mockRecipe: Recipe = {
  id: '1',
  title: 'Test Recipe',
  ingredients: JSON.stringify([
    { name: 'Ingredient 1', amount: 1, unit: 'cup', checked: false },
    { name: 'Ingredient 2', amount: 2, unit: 'tbsp', checked: false },
  ]),
  instructions: JSON.stringify([
    'Step 1: Do something',
    'Step 2: Do something else',
    'Step 3: Finish up',
  ]),
  prepTime: 10,
  cookTime: 20,
  servings: 4,
  difficulty: 'Medium',
  cuisineType: 'Italian',
  tags: ['vegetarian', 'quick'],
  imageUrl: null,
  nutrition: null,
  timers: JSON.stringify([]),
  userId: 'test-user',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('CookingView', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('renders recipe details correctly', () => {
    renderWithProviders(<CookingView recipe={mockRecipe} onClose={mockOnClose} />)
    expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    expect(screen.getByText('Step 1: Do something')).toBeInTheDocument()
  })

  it('handles step navigation correctly', async () => {
    const { user } = renderWithProviders(<CookingView recipe={mockRecipe} onClose={mockOnClose} />)
    await user.click(screen.getByText('Next'))
    expect(screen.getByText('Step 2: Do something else')).toBeInTheDocument()
  })

  it('handles ingredient toggling', async () => {
    const { user } = renderWithProviders(<CookingView recipe={mockRecipe} onClose={mockOnClose} />)
    const ingredient = screen.getByText('Ingredient 1')
    await user.click(ingredient)
    expect(ingredient).toHaveClass('line-through')
  })

  it('handles timer creation and control', async () => {
    const { user } = renderWithProviders(<CookingView recipe={mockRecipe} onClose={mockOnClose} />)
    await user.click(screen.getByText('Add Timer'))
    await user.type(screen.getByRole('textbox', { name: /timer name/i }), 'Test Timer')
    await user.type(screen.getByRole('spinbutton', { name: /duration/i }), '5')
    await user.click(screen.getByText('Start'))
    expect(screen.getByText('Test Timer')).toBeInTheDocument()
    expect(screen.getByText('5:00')).toBeInTheDocument()
  })

  it('handles session pause and resume', async () => {
    const { user } = renderWithProviders(<CookingView recipe={mockRecipe} onClose={mockOnClose} />)
    await user.click(screen.getByText('Pause'))
    expect(screen.getByText('Resume')).toBeInTheDocument()
    await user.click(screen.getByText('Resume'))
    expect(screen.getByText('Pause')).toBeInTheDocument()
  })

  it('handles step notes and ratings', async () => {
    const { user } = renderWithProviders(<CookingView recipe={mockRecipe} onClose={mockOnClose} />)
    await user.click(screen.getByText('Add Note'))
    await user.type(screen.getByRole('textbox', { name: /note/i }), 'Test note')
    await user.click(screen.getByText('Save'))
    await user.click(screen.getByText('👍'))
    expect(screen.getByText('Test note')).toBeInTheDocument()
    expect(screen.getByText('👍')).toHaveClass('text-green-500')
  })
}) 