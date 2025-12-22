
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import {
  Search,
  Brain,
  Volume2
} from 'lucide-react'

interface ResourceBreakdownProps {
  resources: {
    extractionTokens: number
    extractionCost: number
    curationTokens: number
    curationCost: number
    audioTokens: number
    audioCost: number
  }
}

export function ResourceBreakdown({ resources }: ResourceBreakdownProps) {
  const resourceCards = [
    {
      title: 'Tokens de Extracción',
      tokens: resources?.extractionTokens ?? 0,
      cost: resources?.extractionCost ?? 0,
      icon: Search,
      color: 'bg-orange-50 border-orange-200',
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-100'
    },
    {
      title: 'Tokens de Curación (IA)',
      tokens: resources?.curationTokens ?? 0,
      cost: resources?.curationCost ?? 0,
      icon: Brain,
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100'
    },
    {
      title: 'Tokens de Audio (TTS)',
      tokens: resources?.audioTokens ?? 0,
      cost: resources?.audioCost ?? 0,
      icon: Volume2,
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100'
    }
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Desglose de Uso de Recursos
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {resourceCards.map((resource, index) => (
          <motion.div
            key={resource.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className={`${resource.color} shadow-sm hover:shadow-md transition-all duration-200 h-full`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${resource.iconBg}`}>
                    <resource.icon className={`h-6 w-6 ${resource.iconColor}`} />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-gray-600 leading-none mb-2">
                    {resource.title}
                  </h3>
                  <div className="text-3xl font-bold text-gray-900 tracking-tight">
                    {resource.tokens.toLocaleString()}
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    Costo: ${resource.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
