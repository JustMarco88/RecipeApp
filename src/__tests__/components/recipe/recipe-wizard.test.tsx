import React from 'react'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../utils/test-utils'
import { RecipeWizard } from '@/components/recipe/recipe-wizard'

jest.mock('@/utils/logger')

describe('RecipeWizard', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    jest.clearAllMocks()
  })

  describe('Form Rendering', () => {
    it('renders the form with all fields', () => {
      renderWithProviders(<RecipeWizard onClose={mockOnClose} />)
      expect(screen.getByPlaceholderText('Recipe title')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Ingredients')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Instructions')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Prep time')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Cook time')).toBeInTheDocument()
    })

    it('shows difficulty selector', () => {
      renderWithProviders(<RecipeWizard onClose={mockOnClose} />)
      const difficultySelect = screen.getByRole('combobox')
      expect(difficultySelect).toBeInTheDocument()
      expect(screen.getByText('Easy')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
      expect(screen.getByText('Hard')).toBeInTheDocument()
    })
  })

  describe('Form Interactions', () => {
    it('handles form submission', async () => {
      const { user } = renderWithProviders(<RecipeWizard onClose={mockOnClose} />)

      await user.type(screen.getByPlaceholderText('Recipe title'), 'Test Recipe')
      await user.type(screen.getByPlaceholderText('Ingredients'), 'Ingredient 1\nIngredient 2')
      await user.type(screen.getByPlaceholderText('Instructions'), 'Step 1\nStep 2')
      await user.type(screen.getByPlaceholderText('Prep time'), '30')
      await user.type(screen.getByPlaceholderText('Cook time'), '45')
      await user.selectOptions(screen.getByRole('combobox'), 'Medium')

      await user.click(screen.getByText('Create Recipe'))
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('handles form cancellation', async () => {
      const { user } = renderWithProviders(<RecipeWizard onClose={mockOnClose} />)
      await user.click(screen.getByText('Cancel'))
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('validates required fields', async () => {
      const { user } = renderWithProviders(<RecipeWizard onClose={mockOnClose} />)
      await user.click(screen.getByText('Create Recipe'))
      expect(screen.getByText('Title is required')).toBeInTheDocument()
      expect(screen.getByText('Ingredients are required')).toBeInTheDocument()
      expect(screen.getByText('Instructions are required')).toBeInTheDocument()
    })

    it('validates numeric fields', async () => {
      const { user } = renderWithProviders(<RecipeWizard onClose={mockOnClose} />)
      await user.type(screen.getByPlaceholderText('Prep time'), '-1')
      await user.type(screen.getByPlaceholderText('Cook time'), 'abc')
      await user.click(screen.getByText('Create Recipe'))
      expect(screen.getByText('Prep time must be positive')).toBeInTheDocument()
      expect(screen.getByText('Cook time must be a number')).toBeInTheDocument()
    })
  })

  describe('AI Integration', () => {
    it('handles AI recipe generation', async () => {
      const { user } = renderWithProviders(<RecipeWizard onClose={mockOnClose} />)
      await user.type(screen.getByPlaceholderText('Recipe description'), 'A simple pasta dish')
      await user.click(screen.getByText('Generate with AI'))
      expect(screen.getByText('Generating recipe...')).toBeInTheDocument()
    })

    it('handles AI generation errors', async () => {
      const { user } = renderWithProviders(<RecipeWizard onClose={mockOnClose} />)
      // Mock AI error
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('AI service unavailable'))

      await user.type(screen.getByPlaceholderText('Recipe description'), 'A simple pasta dish')
      await user.click(screen.getByText('Generate with AI'))
      expect(screen.getByText('Failed to generate recipe')).toBeInTheDocument()
    })
  })

  describe('Image Upload', () => {
    it('handles image upload', async () => {
      const { user } = renderWithProviders(<RecipeWizard onClose={mockOnClose} />)
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText('Upload image')
      await user.upload(input, file)
      expect(screen.getByText('test.jpg')).toBeInTheDocument()
    })

    it('validates image file type', async () => {
      const { user } = renderWithProviders(<RecipeWizard onClose={mockOnClose} />)
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      const input = screen.getByLabelText('Upload image')
      await user.upload(input, file)
      expect(screen.getByText('Invalid file type')).toBeInTheDocument()
    })
  })
})
