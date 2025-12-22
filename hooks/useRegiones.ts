import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Region {
    region: string
    esta_activo: boolean
}

export function useRegiones() {
    const [regiones, setRegiones] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadRegiones = async () => {
            try {
                setLoading(true)
                setError(null)

                const { data, error: fetchError } = await supabase
                    .from('configuraciones_regiones')
                    .select('region, esta_activo')
                    .eq('esta_activo', true)
                    .order('region')

                if (fetchError) throw fetchError

                if (data) {
                    setRegiones(data.map((r: Region) => r.region))
                }
            } catch (err) {
                console.error('Error cargando regiones:', err)
                setError(err instanceof Error ? err.message : 'Error desconocido')
            } finally {
                setLoading(false)
            }
        }

        loadRegiones()
    }, [])

    return { regiones, loading, error }
}
