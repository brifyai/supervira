
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, Download, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PaymentSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  paymentData?: {
    id: string
    amount: number
    planName: string
    receiptUrl?: string
  }
}

export function PaymentSuccessModal({ 
  isOpen, 
  onClose, 
  paymentData 
}: PaymentSuccessModalProps) {
  const router = useRouter()

  const handleContinue = () => {
    onClose()
    router.push('/dashboard')
  }

  const handleDownloadReceipt = () => {
    if (paymentData?.receiptUrl) {
      window.open(paymentData.receiptUrl, '_blank')
    } else {
      // Generar factura
      router.push(`/api/invoices/${paymentData?.id}`)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            ¡Pago Exitoso!
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Tu pago ha sido procesado correctamente
          </DialogDescription>
        </DialogHeader>

        {paymentData && (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium">{paymentData.planName}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-600">Monto:</span>
                <span className="font-medium">
                  ${paymentData.amount.toLocaleString('es-CL')} CLP
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-600">ID de Pago:</span>
                <span className="font-mono text-xs">{paymentData.id}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadReceipt}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar Recibo
              </Button>
              <Button 
                onClick={handleContinue}
                className="flex-1"
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {!paymentData && (
          <div className="mt-4">
            <Button onClick={handleContinue} className="w-full">
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
