'use client'

export const dynamic = 'force-dynamic'

// Página deshabilitada temporalmente - redirige al Dashboard
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PagosPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirigiendo...</p>
    </div>
  )
}
