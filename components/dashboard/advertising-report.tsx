
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Megaphone } from 'lucide-react'

interface AdvertisingReportProps {
  campaigns: Array<{
    name: string
    reproductions: number
  }>
}

export function AdvertisingReport({ campaigns }: AdvertisingReportProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="w-full"
    >
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <Megaphone className="h-5 w-5 text-green-600" />
            <span>Reporte Publicitario</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaña
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reproducciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns?.map((campaign, index) => (
                  <tr key={campaign?.name ?? index} className="hover:bg-gray-50">
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                      {campaign?.name ?? 'N/A'}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                      {campaign?.reproductions?.toLocaleString('en-US') ?? '0'}
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
