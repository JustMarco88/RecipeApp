import { screen } from '@testing-library/react'
import { RecipeWizard } from '@/components/recipe/recipe-wizard'
import { renderWithProviders } from '../../utils/test-utils'

describe('RecipeWizard', () => {
  describe('Name Step', () => {
    const mockOnClose = jest.fn()

    beforeEach(() => {
      mockOnClose.mockClear()
    })

    it('renders the initial name input step', async () => {
      const { expectToBeInDocument } = renderWithProviders(<RecipeWizard onClose={mockOnClose} />)
      await expectToBeInDocument('Create New Recipe')
      await expectToBeInDocument('Enter recipe name...')
    })

    it('shows error when trying to proceed without a name', async () => {
      renderWithProviders(<RecipeWizard onClose={mockOnClose} />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('allows proceeding when a name is entered', async () => {
      const { user } = renderWithProviders(<RecipeWizard onClose={mockOnClose} />)

      const input = screen.getByPlaceholderText('Enter recipe name...')
      await user.type(input, 'Test Recipe')

      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeEnabled()
    })

    it('proceeds to method selection on Enter key', async () => {
      const { user, expectToBeInDocument } = renderWithProviders(
        <RecipeWizard onClose={mockOnClose} />
      )

      const input = screen.getByPlaceholderText('Enter recipe name...')
      await user.type(input, 'Test Recipe{Enter}')

      await expectToBeInDocument("I'll write it myself")
      await expectToBeInDocument('Help me with AI')
    })

    it('closes when clicking the close button', async () => {
      const { user } = renderWithProviders(<RecipeWizard onClose={mockOnClose} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('Method Selection Step', () => {
    const mockOnClose = jest.fn()

    it('displays both manual and AI options', async () => {
      const { user, expectToBeInDocument } = renderWithProviders(
        <RecipeWizard onClose={mockOnClose} />
      )

      const input = screen.getByPlaceholderText('Enter recipe name...')
      await user.type(input, 'Test Recipe{Enter}')

      await expectToBeInDocument("I'll write it myself")
      await expectToBeInDocument('Help me with AI')
    })

    it('navigates to AI requirements when selecting AI option', async () => {
      const { user, expectToBeInDocument } = renderWithProviders(
        <RecipeWizard onClose={mockOnClose} />
      )

      const input = screen.getByPlaceholderText('Enter recipe name...')
      await user.type(input, 'Test Recipe{Enter}')

      const aiButton = await screen.findByText('Help me with AI')
      await user.click(aiButton)

      await expectToBeInDocument('Number of Servings')
      await expectToBeInDocument('Dietary Restrictions')
    })

    it('navigates back to name step', async () => {
      const { user, expectToBeInDocument } = renderWithProviders(
        <RecipeWizard onClose={mockOnClose} />
      )

      const input = screen.getByPlaceholderText('Enter recipe name...')
      await user.type(input, 'Test Recipe{Enter}')

      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)

      await expectToBeInDocument('Create New Recipe')
    })
  })

  describe('AI Requirements Step', () => {
    const mockOnClose = jest.fn()

    it('displays AI requirement form fields', async () => {
      const { user, expectToBeInDocument } = renderWithProviders(
        <RecipeWizard onClose={mockOnClose} />
      )

      const input = screen.getByPlaceholderText('Enter recipe name...')
      await user.type(input, 'Test Recipe{Enter}')

      const aiButton = await screen.findByText('Help me with AI')
      await user.click(aiButton)

      await expectToBeInDocument('Number of Servings')
      await expectToBeInDocument('Dietary Restrictions')
      await expectToBeInDocument('Preferences & Notes')
      await expectToBeInDocument('Difficulty Level')
    })

    it('allows setting servings', async () => {
      const { user } = renderWithProviders(<RecipeWizard onClose={mockOnClose} />)

      const input = screen.getByPlaceholderText('Enter recipe name...')
      await user.type(input, 'Test Recipe{Enter}')

      const aiButton = await screen.findByText('Help me with AI')
      await user.click(aiButton)

      const servingsInput = screen.getByRole('spinbutton')
      await user.clear(servingsInput)
      await user.type(servingsInput, '6')

      expect(servingsInput).toHaveValue(6)
    })

    it('allows selecting dietary restrictions', async () => {
      const { user } = renderWithProviders(<RecipeWizard onClose={mockOnClose} />)

      const input = screen.getByPlaceholderText('Enter recipe name...')
      await user.type(input, 'Test Recipe{Enter}')

      const aiButton = await screen.findByText('Help me with AI')
      await user.click(aiButton)

      const selectButton = screen.getByRole('combobox')
      await user.click(selectButton)

      const veganOption = screen.getByText('Vegan')
      await user.click(veganOption)

      expect(screen.getByText('Vegan')).toBeInTheDocument()
    })

    it('allows entering preferences', async () => {
      const { user } = renderWithProviders(<RecipeWizard onClose={mockOnClose} />)

      const input = screen.getByPlaceholderText('Enter recipe name...')
      await user.type(input, 'Test Recipe{Enter}')

      const aiButton = await screen.findByText('Help me with AI')
      await user.click(aiButton)

      const textarea = screen.getByPlaceholderText(/specific preferences/i)
      await user.type(textarea, 'Extra spicy')

      expect(textarea).toHaveValue('Extra spicy')
    })

    it('navigates back to method selection', async () => {
      const { user, expectToBeInDocument } = renderWithProviders(
        <RecipeWizard onClose={mockOnClose} />
      )

      const input = screen.getByPlaceholderText('Enter recipe name...')
      await user.type(input, 'Test Recipe{Enter}')

      const aiButton = await screen.findByText('Help me with AI')
      await user.click(aiButton)

      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)

      await expectToBeInDocument("I'll write it myself")
      await expectToBeInDocument('Help me with AI')
    })
  })
})
