/**
 * Unit Tests - Badge Component
 * 
 * Tests for the shadcn/ui Badge component
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('should render badge with text', () => {
      render(<Badge>Status</Badge>)
      expect(screen.getByText('Status')).toBeInTheDocument()
    })

    it('should render badge with children elements', () => {
      render(
        <Badge>
          <span data-testid="icon">✓</span>
          Success
        </Badge>
      )
      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText('Success')).toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it('should apply default variant styles', () => {
      render(<Badge data-testid="badge">Default</Badge>)
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('bg-primary')
    })

    it('should apply secondary variant styles', () => {
      render(<Badge variant="secondary" data-testid="badge">Secondary</Badge>)
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('bg-secondary')
    })

    it('should apply destructive variant styles', () => {
      render(<Badge variant="destructive" data-testid="badge">Destructive</Badge>)
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('bg-destructive')
    })

    it('should apply outline variant styles', () => {
      render(<Badge variant="outline" data-testid="badge">Outline</Badge>)
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('text-foreground')
    })
  })

  describe('Styling', () => {
    it('should have base styles', () => {
      render(<Badge data-testid="badge">Badge</Badge>)
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-md')
    })

    it('should merge custom className', () => {
      render(<Badge className="custom-class" data-testid="badge">Custom</Badge>)
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('custom-class')
      expect(badge).toHaveClass('inline-flex') // Still has base classes
    })

    it('should have correct font styling', () => {
      render(<Badge data-testid="badge">Badge</Badge>)
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveClass('text-xs', 'font-semibold')
    })
  })

  describe('Use Cases', () => {
    it('should work for status indicators', () => {
      render(
        <>
          <Badge variant="default">Active</Badge>
          <Badge variant="secondary">Pending</Badge>
          <Badge variant="destructive">Inactive</Badge>
        </>
      )
      
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })

    it('should work for count badges', () => {
      render(<Badge>5</Badge>)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should work for labels', () => {
      render(<Badge variant="outline">New Feature</Badge>)
      expect(screen.getByText('New Feature')).toBeInTheDocument()
    })
  })

  describe('HTML Attributes', () => {
    it('should pass through HTML attributes', () => {
      render(
        <Badge data-testid="badge" id="status-badge" title="Status indicator">
          Status
        </Badge>
      )
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveAttribute('id', 'status-badge')
      expect(badge).toHaveAttribute('title', 'Status indicator')
    })
  })
})
