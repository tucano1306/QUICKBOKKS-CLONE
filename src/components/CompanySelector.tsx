'use client'

import { useCompany } from '@/contexts/CompanyContext'
import { useState } from 'react'
import Image from 'next/image'

export default function CompanySelector() {
  const { activeCompany, companies, setActiveCompany, isLoading } = useCompany()
  const [isOpen, setIsOpen] = useState(false)

  if (isLoading || !activeCompany) {
    return (
      <div className="px-4 py-2 bg-gray-100 rounded-lg animate-pulse">
        <div className="h-5 w-32 bg-gray-300 rounded"></div>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          {activeCompany.logo ? (
            <Image src={activeCompany.logo} alt="" width={24} height={24} className="w-6 h-6 rounded" />
          ) : (
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
              {activeCompany.name.charAt(0)}
            </div>
          )}
          <span className="font-medium text-gray-900">{activeCompany.name}</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-96 overflow-y-auto">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Seleccionar Empresa
              </div>
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => {
                    setActiveCompany(company)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    company.id === activeCompany.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                >
                  {company.logo ? (
                    <Image src={company.logo} alt="" width={32} height={32} className="w-8 h-8 rounded" />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center text-white font-bold">
                      {company.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-medium">{company.name}</div>
                    {company.taxId && (
                      <div className="text-xs text-gray-500">{company.taxId}</div>
                    )}
                  </div>
                  {company.id === activeCompany.id && (
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-200 p-2 space-y-1">
              <a
                href="/company/dashboard"
                className="block w-full text-center px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                📊 Ir al Dashboard
              </a>
              <a
                href="/companies"
                className="block w-full text-center px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                ⚙ Administrar Empresas
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
