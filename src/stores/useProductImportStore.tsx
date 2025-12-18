import React, { createContext, useContext, useState, ReactNode } from 'react'
import { ProductImport } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import {
  saveProductImport,
  deleteProductImport,
  logImportAudit,
} from '@/services/product-imports'
import { toast } from 'sonner'
import { queryClient } from '@/lib/query-client'

interface ProductImportContextType {
  loading: boolean
  addImport: (data: Partial<ProductImport>) => Promise<void>
  updateImport: (data: Partial<ProductImport>) => Promise<void>
  deleteImport: (id: string) => Promise<void>
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
  const [loading, setLoading] = useState(false)

  const addImport = async (data: Partial<ProductImport>) => {
    if (!user) return
    setLoading(true)
    try {
      const newImport = await saveProductImport(data, user.id)
      await logImportAudit('Create', newImport.id, user.id, {
        process: newImport.process_number,
      })
      toast.success('Importação criada com sucesso!')
      queryClient.invalidate('product-imports')
    } catch (error: any) {
      toast.error('Erro ao criar importação: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateImport = async (data: Partial<ProductImport>) => {
    if (!user || !data.id) return
    setLoading(true)
    try {
      const updated = await saveProductImport(data, user.id)
      await logImportAudit('Update', updated.id, user.id, {
        process: updated.process_number,
      })
      toast.success('Importação atualizada com sucesso!')
      queryClient.invalidate('product-imports')
    } catch (error: any) {
      toast.error('Erro ao atualizar importação: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteImport = async (id: string) => {
    if (!user) return
    setLoading(true)
    try {
      await deleteProductImport(id)
      await logImportAudit('Delete', id, user.id, {})
      toast.success('Importação excluída com sucesso!')
      queryClient.invalidate('product-imports')
    } catch (error: any) {
      toast.error('Erro ao excluir importação: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProductImportContext.Provider
      value={{
        loading,
        addImport,
        updateImport,
        deleteImport,
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
