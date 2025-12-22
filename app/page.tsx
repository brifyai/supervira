'use client'

export const dynamic = 'force-dynamic'

import { Navigation } from '@/components/navigation'
import { DashboardByRole } from '@/components/dashboard/dashboard-by-role'
import { useSupabaseUser } from '@/hooks/use-supabase-user'

export default function DashboardPage() {
  const { userData, isLoading } = useSupabaseUser()

  // Usar el rol desde userData (viene del contexto del cliente)
  const userRole = userData?.role || 'user'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <DashboardByRole role={userRole} />
      </main>
    </div>
  )
}
