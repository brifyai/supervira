'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Loader2, AlertCircle } from 'lucide-react'

interface Radio {
    id: string
    region: string
    nombre?: string
    name?: string
    frecuencia?: string
}

interface RegionSelectorProps {
    selectedRegion: string
    selectedRadio: string
    onRegionChange: (region: string) => void
    onRadioChange: (radio: string) => void
    regions: string[]
    radios: Radio[]
    loading?: boolean
    error?: string | null
}

export function RegionSelector({
    selectedRegion,
    selectedRadio,
    onRegionChange,
    onRadioChange,
    regions,
    radios,
    loading = false,
    error = null
}: RegionSelectorProps) {
    const filteredRadios = radios.filter(radio => radio.region === selectedRegion)

    return (
        <div className="space-y-4">
            {/* Error message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">
                        <p className="font-medium">Error al cargar radios</p>
                        <p className="text-xs mt-1">{error}</p>
                        <p className="text-xs mt-1">Puedes agregar radios en <a href="/activos" className="underline font-medium">/activos</a></p>
                    </div>
                </div>
            )}

            <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Región
                </label>
                <Select value={selectedRegion} onValueChange={onRegionChange} disabled={loading || regions.length === 0}>
                    <SelectTrigger>
                        <SelectValue placeholder={loading ? "Cargando regiones..." : "Selecciona una región"} />
                    </SelectTrigger>
                    <SelectContent>
                        {regions.map((region) => (
                            <SelectItem key={region} value={region}>
                                {region}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedRegion && (
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                        <span>Radio</span>
                        {loading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                    </label>
                    <Select value={selectedRadio} onValueChange={onRadioChange} disabled={loading || filteredRadios.length === 0}>
                        <SelectTrigger>
                            <SelectValue placeholder={
                                loading ? "Cargando radios..." :
                                    filteredRadios.length === 0 ? "No hay radios para esta región" :
                                        "Selecciona una radio"
                            } />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredRadios.map((radio) => {
                                const radioName = radio.nombre || radio.name || 'Sin nombre'
                                return (
                                    <SelectItem key={radio.id} value={radioName}>
                                        {radioName}
                                        {radio.frecuencia && <span className="text-xs text-gray-500 ml-2">({radio.frecuencia})</span>}
                                    </SelectItem>
                                )
                            })}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    )
}
