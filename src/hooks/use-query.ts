import { useState, useEffect, useCallback } from 'react'
import { queryClient } from '@/lib/query-client'

interface UseQueryOptions {
  enabled?: boolean
  staleTime?: number
  dependencies?: any[]
}

export function useQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseQueryOptions = {},
) {
  const { enabled = true, staleTime, dependencies = [] } = options
  const [data, setData] = useState<T | null>(() =>
    queryClient.getCached<T>(key),
  )
  const [isLoading, setIsLoading] = useState(!data && enabled)
  const [error, setError] = useState<any>(null)

  const fetchData = useCallback(
    async (force = false) => {
      if (!enabled) return

      if (!force) {
        const cached = queryClient.getCached<T>(key)
        if (cached) {
          setData(cached)
          setIsLoading(false)
          return
        }
      }

      setIsLoading(true)
      setError(null)
      try {
        const result = await fetcher()
        queryClient.setCache(key, result, staleTime)
        setData(result)
      } catch (err) {
        setError(err)
      } finally {
        setIsLoading(false)
      }
    },
    [key, enabled, staleTime],
  ) // fetcher not in deps to avoid loop if inline

  useEffect(() => {
    fetchData()
  }, [key, enabled, ...dependencies])

  return { data, isLoading, error, refetch: () => fetchData(true) }
}
