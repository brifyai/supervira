'use client'

import { useRegiones } from '@/hooks/useRegiones'

/**
 * Componente de ejemplo que muestra cómo usar el hook useRegiones
 * para crear un selector de regiones en el frontend
 */
export function RegionSelector() {
    const { regiones, loading, error } = useRegiones()

    if (loading) {
        return (
            <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span className="text-sm text-gray-600">Cargando regiones...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-sm text-red-600">
                Error al cargar regiones: {error}
            </div>
        )
    }

    return (
        <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            defaultValue=""
        >
            <option value="" disabled>
                Selecciona una región
            </option>
            {regiones.map((region) => (
                <option key={region} value={region}>
                    {region}
                </option>
            ))}
        </select>
    )
}
