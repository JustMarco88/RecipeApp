import React from 'react'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/test-utils'
import { type Recipe } from '@/types/recipe'
import { CookingView } from '@/components/recipe/cooking-view'

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

// Mock the logger
jest.mock('@/utils/logger')

describe('CookingView', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    jest.clearAllMocks()
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

  // New test cases
  it('handles session completion', async () => {
    const { user } = renderWithProviders(<CookingView recipe={mockRecipe} onClose={mockOnClose} />)
    await user.click(screen.getByText('Finish'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('logs errors when step update fails', async () => {
    const { user } = renderWithProviders(<CookingView recipe={mockRecipe} onClose={mockOnClose} />)
    const error = new Error('Update failed')
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(error)

    await user.click(screen.getByText('Next'))
    expect(screen.getByText('Error updating step')).toBeInTheDocument()
  })

  it('handles timer deletion', async () => {
    const { user } = renderWithProviders(<CookingView recipe={mockRecipe} onClose={mockOnClose} />)
    await user.click(screen.getByText('Add Timer'))
    await user.type(screen.getByRole('textbox', { name: /timer name/i }), 'Test Timer')
    await user.type(screen.getByRole('spinbutton', { name: /duration/i }), '5')
    await user.click(screen.getByText('Start'))

    await user.click(screen.getByLabelText('Delete timer'))
    expect(screen.queryByText('Test Timer')).not.toBeInTheDocument()
  })
})
