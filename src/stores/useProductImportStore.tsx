import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { ProductImport } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import {
  getProductImports,
  saveProductImport,
  deleteProductImport,
  logImportAudit,
} from '@/services/product-imports'
import { getVisibleCompanyIds } from '@/services/financial'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import useCashFlowStore from '@/stores/useCashFlowStore'

interface ProductImportContextType {
  imports: ProductImport[]
  loading: boolean
  addImport: (data: Partial<ProductImport>) => Promise<void>
  updateImport: (data: Partial<ProductImport>) => Promise<void>
  deleteImport: (id: string) => Promise<void>
  refreshImports: () => Promise<void>
}

const ProductImportContext = createContext<
  ProductImportContextType | undefined
>(undefined)

export const ProductImportProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const { user } = useAuth()
  const { selectedCompanyId } = useCashFlowStore()
  const [imports, setImports] = useState<ProductImport[]>([])
  const [loading, setLoading] = useState(false)

  const refreshImports = async () => {
    if (!user) return

    setLoading(true)
    try {
      const visibleIds = await getVisibleCompanyIds(
        supabase,
        user.id,
        selectedCompanyId,
      )
      if (visibleIds.length > 0) {
        const data = await getProductImports(visibleIds)
        setImports(data)
      } else {
        setImports([])
      }
    } catch (error: any) {
      console.error('Error fetching imports:', error)
      toast.error('Erro ao carregar importações.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshImports()
  }, [user, selectedCompanyId])

  const addImport = async (data: Partial<ProductImport>) => {
    if (!user) return
    try {
      const newImport = await saveProductImport(data, user.id)
      await logImportAudit('Create', newImport.id, user.id, {
        process: newImport.process_number,
      })
      toast.success('Importação criada com sucesso!')
      refreshImports()
    } catch (error: any) {
      toast.error('Erro ao criar importação: ' + error.message)
    }
  }

  const updateImport = async (data: Partial<ProductImport>) => {
    if (!user || !data.id) return
    try {
      const updated = await saveProductImport(data, user.id)
      await logImportAudit('Update', updated.id, user.id, {
        process: updated.process_number,
      })
      toast.success('Importação atualizada com sucesso!')
      refreshImports()
    } catch (error: any) {
      toast.error('Erro ao atualizar importação: ' + error.message)
    }
  }

  const deleteImport = async (id: string) => {
    if (!user) return
    try {
      await deleteProductImport(id)
      await logImportAudit('Delete', id, user.id, {})
      toast.success('Importação excluída com sucesso!')
      setImports((prev) => prev.filter((i) => i.id !== id))
    } catch (error: any) {
      toast.error('Erro ao excluir importação: ' + error.message)
    }
  }

  return (
    <ProductImportContext.Provider
      value={{
        imports,
        loading,
        addImport,
        updateImport,
        deleteImport,
        refreshImports,
      }}
    >
      {children}
    </ProductImportContext.Provider>
  )
}

export default function useProductImportStore() {
  const context = useContext(ProductImportContext)
  if (context === undefined) {
    throw new Error(
      'useProductImportStore must be used within a ProductImportProvider',
    )
  }
  return context
}
