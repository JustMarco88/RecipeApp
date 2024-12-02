import { renderWithProviders } from './test-utils'
import { screen } from '@testing-library/react'

describe('renderWithProviders', () => {
  it('renders a component with providers', () => {
    const TestComponent = () => <div>Test Component</div>
    renderWithProviders(<TestComponent />)
    expect(screen.getByText('Test Component')).toBeInTheDocument()
  })
})
