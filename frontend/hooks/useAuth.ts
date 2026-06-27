'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getApiKey, getTenantId, getTenantName, clearAuth } from '@/lib/auth'

interface AuthState {
  apiKey: string | null
  tenantId: string | null
  tenantName: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth(): AuthState & { logout: () => void } {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    apiKey: null,
    tenantId: null,
    tenantName: null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    const apiKey = getApiKey()
    const tenantId = getTenantId()
    const tenantName = getTenantName()

    setState({
      apiKey,
      tenantId,
      tenantName,
      isLoading: false,
      isAuthenticated: !!apiKey,
    })
  }, [])

  function logout() {
    clearAuth()
    router.push('/login')
  }

  return { ...state, logout }
}
