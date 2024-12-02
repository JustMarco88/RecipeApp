import { render, screen } from '@testing-library/react'
import { RecipeWizard } from '@/components/recipe/recipe-wizard'
import userEvent from '@testing-library/user-event'

// Mock the API context
jest.mock('@/utils/api', () => ({
  api: {
    useContext: () => ({}),
    recipe: {
      create: {
        useMutation: () => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
      getSuggestions: {
        useMutation: () => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
      generateImage: {
        useMutation: () => ({
          mutate: jest.fn(),
          isLoading: false,
        }),
      },
    },
  },
}))

describe('RecipeWizard', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('renders the initial name input step', () => {
    render(<RecipeWizard onClose={mockOnClose} />)

    expect(screen.getByText('Create New Recipe')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter recipe name...')).toBeInTheDocument()
  })

  it('shows error when trying to proceed without a name', async () => {
    render(<RecipeWizard onClose={mockOnClose} />)

    const nextButton = screen.getByText('Next')
    expect(nextButton).toBeDisabled()
  })

  it('allows proceeding when a name is entered', async () => {
    const user = userEvent.setup()
    render(<RecipeWizard onClose={mockOnClose} />)

    const input = screen.getByPlaceholderText('Enter recipe name...')
    await user.type(input, 'Test Recipe')

    const nextButton = screen.getByText('Next')
    expect(nextButton).not.toBeDisabled()
  })

  it('closes when clicking the close button', async () => {
    const user = userEvent.setup()
    render(<RecipeWizard onClose={mockOnClose} />)

    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })
})
