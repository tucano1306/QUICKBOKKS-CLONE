'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Company {
  id: string
  name: string
  legalName?: string
  taxId?: string
  logo?: string
  industry?: string
  subscription?: string
  status?: string
}

interface CompanyContextType {
  activeCompany: Company | null
  companies: Company[]
  setActiveCompany: (company: Company) => void
  refreshCompanies: () => Promise<void>
  isLoading: boolean
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshCompanies = async () => {
    try {
      const response = await fetch('/api/companies')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data)
        
        // Si no hay empresa activa, seleccionar la primera
        if (!activeCompany && data.length > 0) {
          const savedCompanyId = localStorage.getItem('activeCompanyId')
          const companyToSet = savedCompanyId 
            ? data.find((c: Company) => c.id === savedCompanyId) || data[0]
            : data[0]
          setActiveCompanyState(companyToSet)
        }
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const setActiveCompany = (company: Company) => {
    setActiveCompanyState(company)
    localStorage.setItem('activeCompanyId', company.id)
  }

  useEffect(() => {
    refreshCompanies()
  }, [])

  return (
    <CompanyContext.Provider
      value={{
        activeCompany,
        companies,
        setActiveCompany,
        refreshCompanies,
        isLoading,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}
