'use client'

import { cn } from '@/lib/utils'
import { MoreVertical, Eye, Edit, Trash2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Column<T> {
  key: keyof T | string
  header: string
  width?: string
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  title?: string
  onView?: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  emptyMessage?: string
  isLoading?: boolean
  className?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  title,
  onView,
  onEdit,
  onDelete,
  emptyMessage = 'No hay datos disponibles',
  isLoading = false,
  className
}: DataTableProps<T>) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasActions = onView || onEdit || onDelete

  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200/80 shadow-lg shadow-gray-200/50 overflow-hidden",
      className
    )}>
      {title && (
        <div className="p-4 sm:p-5 md:p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "px-3 py-3 sm:px-4 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider",
                    column.width
                  )}
                >
                  {column.header}
                </th>
              ))}
              {hasActions && (
                <th className="px-3 py-3 sm:px-4 sm:py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-500">Cargando...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const id = keyExtractor(item)
                return (
                  <tr key={id} className="hover:bg-gray-50 transition-colors">
                    {columns.map((column) => (
                      <td key={String(column.key)} className="px-3 py-3 sm:px-4 sm:py-4 text-sm text-gray-900">
                        {column.render 
                          ? column.render(item) 
                          : String(item[column.key as keyof T] ?? '')
                        }
                      </td>
                    ))}
                    {hasActions && (
                      <td className="px-3 py-3 sm:px-4 sm:py-4 text-right relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === id ? null : id)}
                          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        
                        {openMenuId === id && (
                          <div 
                            ref={menuRef}
                            className="absolute right-4 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]"
                          >
                            {onView && (
                              <button
                                onClick={() => { onView(item); setOpenMenuId(null) }}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" /> Ver
                              </button>
                            )}
                            {onEdit && (
                              <button
                                onClick={() => { onEdit(item); setOpenMenuId(null) }}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" /> Editar
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={() => { onDelete(item); setOpenMenuId(null) }}
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" /> Eliminar
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
