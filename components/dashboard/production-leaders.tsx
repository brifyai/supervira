
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'

interface ProductionLeadersProps {
  leaders: Array<{
    rank: number
    radioName: string
    newsCount: number
    tokens: number
  }>
}

export function ProductionLeaders({ leaders }: ProductionLeadersProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full"
    >
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <span>Líderes de Producción</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Radio
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Noticieros
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tokens
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaders?.map((leader, index) => (
                  <tr key={leader?.rank ?? index} className="hover:bg-gray-50">
                    <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {leader?.rank ?? index + 1}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                      {leader?.radioName ?? 'N/A'}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                      {leader?.newsCount ?? 0}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                      {leader?.tokens?.toLocaleString('en-US') ?? '0'}
                    </td>
                  </tr>
                )) ?? []}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
