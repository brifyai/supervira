'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseUser } from '@/hooks/use-supabase-user'
import { supabase } from '@/lib/supabase'

export default function TimelineNoticieroPage() {
  const router = useRouter()
  const { session } = useSupabaseUser()

  useEffect(() => {
    const redirectToLatest = async () => {
      try {
        // 1. Si hay usuario, buscar su último noticiero en la BD
        if (session?.user?.id) {
          const { data: latestNewscast, error } = await supabase
            .from('noticieros')
            .select('id, region')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (latestNewscast && !error) {
            console.log('✅ Último noticiero encontrado:', latestNewscast)
            router.push(`/timeline-noticiero/${latestNewscast.id}`)
            return
          }
        }

        // 2. Si no hay usuario o noticiero, intentar con localStorage (comportamiento anterior)
        const savedConfig = localStorage.getItem('newscast_search_config')

        if (savedConfig) {
          const config = JSON.parse(savedConfig)
          console.log('📋 Configuración extraída del localStorage:', config)
          const regionId = config.region || 'default'
          router.push(`/timeline-noticiero/${regionId}`)
        } else {
          console.log('❌ No se encontró configuración, redirigiendo a default')
          router.push('/timeline-noticiero/default')
        }
      } catch (error) {
        console.error('Error en redirección:', error)
        router.push('/timeline-noticiero/default')
      }
    }

    if (session !== undefined) {
      redirectToLatest()
    }
  }, [router, session])

  // Mostrar una pantalla de carga mientras se redirige
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando configuración...</p>
      </div>
    </div>
  )
}