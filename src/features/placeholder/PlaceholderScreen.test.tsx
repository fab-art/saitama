import { render, screen } from '@testing-library/react'
import { PlaceholderScreen } from './PlaceholderScreen'

describe('PlaceholderScreen', () => {
  it('renders the HeroPath title', () => {
    render(<PlaceholderScreen />)
    expect(screen.getByText('HERO')).toBeInTheDocument()
    expect(screen.getByText('PATH')).toBeInTheDocument()
  })
})
