'use client'

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode, useRef } from 'react'

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

// Cache de empresas en memoria para evitar re-fetches
const companiesCache = {
  data: null as Company[] | null,
  timestamp: 0,
  TTL: 30 * 1000 // 30 segundos de caché
}

/** Seleccionar empresa inicial basada en localStorage o primera disponible */
function selectInitialCompany(companies: Company[]): Company | null {
  if (companies.length === 0) return null
  const savedCompanyId = localStorage.getItem('activeCompanyId')
  return savedCompanyId 
    ? companies.find((c: Company) => c.id === savedCompanyId) || companies[0]
    : companies[0]
}

export function CompanyProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [activeCompany, setActiveCompany] = useState<Company | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])  
  const [isLoading, setIsLoading] = useState(true)
  const fetchInProgress = useRef(false)

  const refreshCompanies = useCallback(async (forceRefresh = false) => {
    // Evitar llamadas duplicadas
    if (fetchInProgress.current) return
    
    // Verificar cache
    const cacheValid = !forceRefresh && companiesCache.data && Date.now() - companiesCache.timestamp < companiesCache.TTL
    if (cacheValid && companiesCache.data) {
      setCompanies(companiesCache.data)
      if (!activeCompany) {
        setActiveCompany(selectInitialCompany(companiesCache.data))
      }
      setIsLoading(false)
      return
    }
    
    fetchInProgress.current = true
    
    try {
      const response = await fetch('/api/companies')
      if (response.ok) {
        const data = await response.json()
        companiesCache.data = data
        companiesCache.timestamp = Date.now()
        setCompanies(data)
        
        if (!activeCompany && data.length > 0) {
          setActiveCompany(selectInitialCompany(data))
        }
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setIsLoading(false)
      fetchInProgress.current = false
    }
  }, [activeCompany])

  const handleSetActiveCompany = (company: Company) => {
    setActiveCompany(company)
    localStorage.setItem('activeCompanyId', company.id)
  }

  // Cargar empresas solo una vez al montar
  useEffect(() => {
    refreshCompanies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const contextValue = useMemo(
    () => ({
      activeCompany,
      companies,
      setActiveCompany: handleSetActiveCompany,
      refreshCompanies,
      isLoading,
    }),
    [activeCompany, companies, isLoading, refreshCompanies]
  )

  return (
    <CompanyContext.Provider value={contextValue}>
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
