
'use client'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock } from 'lucide-react'

interface TimeFiltersProps {
  selectedPeriod?: string
  onPeriodChange?: (period: string) => void
}

export function TimeFilters({ selectedPeriod = "7-days", onPeriodChange }: TimeFiltersProps) {
  const periods = [
    { value: "7-days", label: "Últimos 7 días" },
    { value: "30-days", label: "Últimos 30 días" },
    { value: "90-days", label: "Últimos 3 meses" },
    { value: "year", label: "Este año" }
  ]

  const handleApply = () => {
    // Simular aplicación de filtros
    window.location.reload()
  }

  return (
    <div className="flex items-center space-x-4 mb-6">
      <div className="flex items-center space-x-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            {periods.map(period => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center space-x-2">
        <Clock className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">
          Actualizado hace 5 minutos
        </span>
      </div>

      <Button variant="outline" size="sm" className="ml-auto" onClick={handleApply}>
        Aplicar
      </Button>
    </div>
  )
}
