
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, Globe, RefreshCw } from 'lucide-react'

interface UrgentFiltersProps {
  selectedTime: string
  selectedRegion: string
  selectedCategory: string
  onTimeChange: (time: string) => void
  onRegionChange: (region: string) => void
  onCategoryChange: (category: string) => void
  onSearch: () => void
  isLoading: boolean
  newsCount: number
  fuentes?: any[] // Deprecated: usar availableRegions
  availableRegions?: string[]
}

const timeOptions = [
  { value: '1', label: 'Última hora', priority: 'high' },
  { value: '3', label: 'Últimas 3 horas', priority: 'high' },
  { value: '5', label: 'Últimas 5 horas', priority: 'medium' },
  { value: '12', label: 'Últimas 12 horas', priority: 'medium' },
  { value: '24', label: 'Últimas 24 horas', priority: 'medium' },
  { value: '48', label: 'Últimos 2 días', priority: 'low' },
  { value: '72', label: 'Últimos 3 días', priority: 'low' }
]

// Regiones por defecto (fallback)
const defaultRegionOptions = [
  { value: 'all', label: 'Todas las regiones', flag: '🇨🇱' },
  { value: 'nacional', label: 'Nacional', flag: '🏛️' },
  { value: 'Metropolitana de Santiago', label: 'R. Metropolitana', flag: '🏙️' },
  { value: 'Valparaíso', label: 'Valparaíso', flag: '⚓' },
  { value: 'Biobío', label: 'Biobío', flag: '🌲' },
  { value: 'Antofagasta', label: 'Antofagasta', flag: '🏜️' },
  { value: 'La Araucanía', label: 'La Araucanía', flag: '🌋' },
  { value: 'Los Lagos', label: 'Los Lagos', flag: '🏔️' }
]

const categoryOptions = [
  { value: 'all', label: 'Todas las categorías', icon: '📰' },
  { value: 'politica', label: 'Política', icon: '🏛️' },
  { value: 'economia', label: 'Economía', icon: '💰' },
  { value: 'emergencia', label: 'Emergencias', icon: '🚨' },
  { value: 'clima', label: 'Clima', icon: '🌤️' },
  { value: 'seguridad', label: 'Seguridad', icon: '👮' },
  { value: 'transporte', label: 'Transporte', icon: '🚗' },
  { value: 'deportes', label: 'Deportes', icon: '⚽' },
  { value: 'tecnologia', label: 'Tecnología', icon: '💻' },
  { value: 'salud', label: 'Salud', icon: '🏥' }
]

export function UrgentFilters({
  selectedTime,
  selectedRegion,
  selectedCategory,
  onTimeChange,
  onRegionChange,
  onCategoryChange,
  onSearch,
  isLoading,
  newsCount,
  fuentes = [],
  availableRegions = []
}: UrgentFiltersProps) {

  // Generar opciones de región
  const getRegionOptions = () => {
    // Si tenemos regiones disponibles explícitamente, usarlas
    if (availableRegions && availableRegions.length > 0) {
      const getRegionIcon = (region: string) => {
        const iconMap: Record<string, string> = {
          'Metropolitana de Santiago': '🏙️',
          'Valparaíso': '⚓',
          'Biobío': '🌲',
          'Antofagasta': '🏜️',
          'La Araucanía': '🌋',
          'Los Lagos': '🏔️',
          'Arica y Parinacota': '🏖️',
          'Tarapacá': '🌵',
          'Atacama': '⛰️',
          'Coquimbo': '🌊',
          "O'Higgins": '🍇',
          'Maule': '🌾',
          'Ñuble': '🌿',
          'Los Ríos': '🏞️',
          'Aysén': '🏔️',
          'Magallanes y Antártica Chilena': '🐧',
          'nacional': '🏛️',
          'Nacional': '🏛️'
        };
        return iconMap[region] || '📍';
      };

      return [
        { value: 'all', label: 'Todas las regiones', flag: '🇨🇱' },
        ...availableRegions.map(region => ({
          value: region,
          label: region,
          flag: getRegionIcon(region)
        }))
      ];
    }

    // Fallback: usar fuentes si existen (lógica antigua)
    if (fuentes && fuentes.length > 0) {
      const uniqueRegions = Array.from(new Set(fuentes.map(f => f.nombre).filter(Boolean)));
      if (uniqueRegions.length > 0) {
        // ... (misma lógica de iconos si fuera necesario, pero simplificamos al fallback)
        return defaultRegionOptions; // Simplificación por ahora
      }
    }

    return defaultRegionOptions;
  };

  const regionOptions = getRegionOptions();
  const getPriorityBadge = (value: string) => {
    const option = timeOptions.find(t => t.value === value)
    if (!option) return null

    const priorityColors: Record<string, string> = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    }

    return (
      <Badge
        variant="outline"
        className={`ml-2 ${priorityColors[option.priority]}`}
      >
        {option.priority === 'high' ? '🔥 Crítico' :
          option.priority === 'medium' ? '⚡ Urgente' : '📅 Estándar'}
      </Badge>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Filtros de Búsqueda Urgente</span>
          {newsCount > 0 && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {newsCount} noticias encontradas
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fila principal de filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="inline h-4 w-4 mr-1 text-red-500" />
              Período de Tiempo
            </label>
            <div className="flex items-center">
              <Select value={selectedTime} onValueChange={onTimeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{option.label}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {option.priority === 'high' ? '🔥' :
                            option.priority === 'medium' ? '⚡' : '📅'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getPriorityBadge(selectedTime)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1 text-blue-500" />
              Región
            </label>
            <Select value={selectedRegion} onValueChange={onRegionChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {regionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span>{option.flag} {option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Globe className="inline h-4 w-4 mr-1 text-green-500" />
              Categoría
            </label>
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span>{option.icon} {option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col justify-end">
            <Button
              onClick={onSearch}
              disabled={isLoading}
              className="h-10 bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Buscar Noticias
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Información contextual */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <span>
                <strong>Período:</strong> {timeOptions.find(t => t.value === selectedTime)?.label}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-600" />
              <span>
                <strong>Región:</strong> {regionOptions.find(r => r.value === selectedRegion)?.label}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-gray-600" />
              <span>
                <strong>Categoría:</strong> {categoryOptions.find(c => c.value === selectedCategory)?.label}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
