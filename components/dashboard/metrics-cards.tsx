
'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { 
  FileText,
  DollarSign,
  Zap,
  Radio,
  TrendingUp
} from 'lucide-react'

interface MetricsCardsProps {
  metrics: {
    totalNewsReports: number
    totalPeriodCost: number
    totalTokens: string
    mostActiveRadio: string
    totalPeriodRevenue: number
  }
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards = [
    {
      title: 'Noticieros Generados',
      value: metrics?.totalNewsReports?.toString() ?? '0',
      subtitle: `Total del Período: $${metrics?.totalPeriodRevenue ?? '0'}`,
      icon: FileText,
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Costo Total del Período',
      value: `$${metrics?.totalPeriodCost?.toLocaleString() ?? '0'}`,
      subtitle: 'Basado en uso de tokens',
      icon: DollarSign,
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Total Tokens Usados',
      value: metrics?.totalTokens ?? '0',
      subtitle: 'En el período seleccionado',
      icon: Zap,
      color: 'bg-green-50 border-green-200',
      iconColor: 'text-green-600'
    },
    {
      title: 'Radio Más Activa',
      value: metrics?.mostActiveRadio ?? 'N/A',
      subtitle: 'Mayor número de noticieros',
      icon: Radio,
      color: 'bg-orange-50 border-orange-200',
      iconColor: 'text-orange-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <Card className={`${card.color} shadow-sm hover:shadow-md transition-shadow`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                <h3 className="text-sm font-medium text-gray-700">
                  {card.title}
                </h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {card.value}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {card.subtitle}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
