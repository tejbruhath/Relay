'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getApiKey } from '@/lib/auth'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { getUsage } from '@/lib/api'
import type { Plan } from '@/lib/types'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [plan, setPlan] = useState<Plan>('free')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Auth guard — client-side check
    const key = getApiKey()
    if (!key) {
      router.replace('/login')
      return
    }
    setReady(true)

    // Fetch plan for sidebar badge (best-effort)
    getUsage()
      .then((u) => setPlan(u.plan))
      .catch(() => {/* ignore */})
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-[var(--bg-border)] border-t-[var(--accent-signal)] rounded-full animate-spin-slow" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex">
      <Sidebar plan={plan} />

      {/* Main scrollable area */}
      <main className="flex-1 md:ml-60 pb-20 md:pb-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
