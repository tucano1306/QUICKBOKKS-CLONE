'use client'

/* eslint-disable @next/next/no-async-client-component */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from './button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

// Pagination component - receives callback functions which are valid in client components
export function Pagination(props: Readonly<{
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  showPageSize?: boolean
}>) {
  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
    showPageSize = true
  } = props
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  // Generar números de página para mostrar
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible + 2) {
      // Mostrar todas las páginas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Siempre mostrar primera página
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis-start')
      }

      // Páginas alrededor de la actual
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis-end')
      }

      // Siempre mostrar última página
      pages.push(totalPages)
    }

    return pages
  }

  if (totalItems === 0) return null

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-3 sm:py-4 bg-gray-50/50 rounded-xl border border-gray-100">
      {/* Info de items */}
      <div className="text-xs sm:text-sm text-gray-600 font-medium text-center sm:text-left">
        <span className="text-[#0D2942] font-semibold">{startItem}</span>-<span className="text-[#0D2942] font-semibold">{endItem}</span> de <span className="text-[#2CA01C] font-semibold">{totalItems}</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        {/* Selector de tamaño de página - solo en desktop */}
        {showPageSize && onPageSizeChange && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm text-gray-600">Por página:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number.parseInt(value))}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Controles de navegación */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Primera página */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={!canGoPrev}
            className="h-8 w-8 p-0 rounded-lg hidden sm:flex"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Página anterior */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrev}
            className="h-8 w-8 p-0 rounded-lg"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Números de página */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {getPageNumbers().map((page, index) => (
              typeof page === 'number' ? (
                <Button
                  key={`page-${page}`}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className={`h-8 w-8 p-0 rounded-lg text-xs sm:text-sm ${page === currentPage ? 'bg-[#2CA01C] hover:bg-[#108000] shadow-md' : ''}`}
                >
                  {page}
                </Button>
              ) : (
                <span key={page} className="px-1 sm:px-2 text-gray-400 text-sm">
                  ...
                </span>
              )
            ))}
          </div>

          {/* Página siguiente */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            className="h-8 w-8 p-0 rounded-lg"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Última página */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoNext}
            className="h-8 w-8 p-0 rounded-lg hidden sm:flex"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
