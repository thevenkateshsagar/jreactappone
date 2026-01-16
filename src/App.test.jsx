import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

describe('App Component', () => {
  it('renders the main heading', () => {
    render(<App />)
    const heading = screen.getByText(/React \+ Vite \+ Jenkins/i)
    expect(heading).toBeInTheDocument()
  })

  it('renders the deployment success message', () => {
    render(<App />)
    const message = screen.getByText(/Successfully deployed with CI\/CD pipeline!/i)
    expect(message).toBeInTheDocument()
  })

  it('increments counter when button is clicked', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /Count is 0/i })
    
    fireEvent.click(button)
    
    expect(screen.getByText(/Count is 1/i)).toBeInTheDocument()
  })

  it('has social media links', () => {
    render(<App />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('displays footer with heart icon', () => {
    render(<App />)
    const footer = screen.getByText(/Made with/i)
    expect(footer).toBeInTheDocument()
  })
})