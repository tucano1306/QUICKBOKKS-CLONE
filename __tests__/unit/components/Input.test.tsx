/**
 * Unit Tests - Input Component
 * 
 * Tests for the shadcn/ui Input component
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render input element', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter your name" />)
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
    })

    it('should render with default value', () => {
      render(<Input defaultValue="Default text" />)
      expect(screen.getByRole('textbox')).toHaveValue('Default text')
    })

    it('should render with controlled value', () => {
      render(<Input value="Controlled value" onChange={() => {}} />)
      expect(screen.getByRole('textbox')).toHaveValue('Controlled value')
    })
  })

  describe('Input Types', () => {
    it('should support text type', () => {
      render(<Input type="text" data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'text')
    })

    it('should support email type', () => {
      render(<Input type="email" data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'email')
    })

    it('should support password type', () => {
      render(<Input type="password" data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'password')
    })

    it('should support number type', () => {
      render(<Input type="number" data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'number')
    })

    it('should support tel type', () => {
      render(<Input type="tel" data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'tel')
    })
  })

  describe('User Interactions', () => {
    it('should handle onChange event', async () => {
      const handleChange = jest.fn()
      render(<Input onChange={handleChange} />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Hello')
      
      expect(handleChange).toHaveBeenCalled()
    })

    it('should update value on user input', async () => {
      render(<Input />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Test input')
      
      expect(input).toHaveValue('Test input')
    })

    it('should handle onFocus event', () => {
      const handleFocus = jest.fn()
      render(<Input onFocus={handleFocus} />)
      
      fireEvent.focus(screen.getByRole('textbox'))
      expect(handleFocus).toHaveBeenCalledTimes(1)
    })

    it('should handle onBlur event', () => {
      const handleBlur = jest.fn()
      render(<Input onBlur={handleBlur} />)
      
      const input = screen.getByRole('textbox')
      fireEvent.focus(input)
      fireEvent.blur(input)
      
      expect(handleBlur).toHaveBeenCalledTimes(1)
    })

    it('should handle onKeyDown event', () => {
      const handleKeyDown = jest.fn()
      render(<Input onKeyDown={handleKeyDown} />)
      
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
      expect(handleKeyDown).toHaveBeenCalledTimes(1)
    })
  })

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('should not accept input when disabled', async () => {
      render(<Input disabled defaultValue="" />)
      
      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'test')
      
      expect(input).toHaveValue('')
    })

    it('should apply disabled styles', () => {
      render(<Input disabled data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
    })
  })

  describe('Custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Input className="custom-class" data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toHaveClass('custom-class')
      expect(input).toHaveClass('flex') // Still has base classes
    })
  })

  describe('HTML Attributes', () => {
    it('should support name attribute', () => {
      render(<Input name="email" data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveAttribute('name', 'email')
    })

    it('should support required attribute', () => {
      render(<Input required data-testid="input" />)
      expect(screen.getByTestId('input')).toBeRequired()
    })

    it('should support readonly attribute', () => {
      render(<Input readOnly data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveAttribute('readonly')
    })

    it('should support maxLength attribute', () => {
      render(<Input maxLength={10} data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveAttribute('maxLength', '10')
    })

    it('should support pattern attribute', () => {
      render(<Input pattern="[0-9]*" data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveAttribute('pattern', '[0-9]*')
    })

    it('should support aria attributes', () => {
      render(<Input aria-label="Search" aria-describedby="search-hint" data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('aria-label', 'Search')
      expect(input).toHaveAttribute('aria-describedby', 'search-hint')
    })
  })

  describe('Ref Forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = React.createRef<HTMLInputElement>()
      render(<Input ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })

    it('should allow focus via ref', () => {
      const ref = React.createRef<HTMLInputElement>()
      render(<Input ref={ref} />)
      
      ref.current?.focus()
      expect(document.activeElement).toBe(ref.current)
    })
  })
})
