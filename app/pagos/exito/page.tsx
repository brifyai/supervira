
'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Download, ArrowLeft, Loader2 } from 'lucide-react'

interface PaymentDetails {
  collection_id: string
  collection_status: string
  payment_id: string
  status: string
  external_reference: string
  payment_type: string
  merchant_order_id: string
  preference_id: string
  site_id: string
  processing_mode: string
  merchant_account_id: string
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPaymentDetails = () => {
      try {
        const details: PaymentDetails = {
          collection_id: searchParams.get('collection_id') || '',
          collection_status: searchParams.get('collection_status') || '',
          payment_id: searchParams.get('payment_id') || '',
          status: searchParams.get('status') || '',
          external_reference: searchParams.get('external_reference') || '',
          payment_type: searchParams.get('payment_type') || '',
          merchant_order_id: searchParams.get('merchant_order_id') || '',
          preference_id: searchParams.get('preference_id') || '',
          site_id: searchParams.get('site_id') || '',
          processing_mode: searchParams.get('processing_mode') || '',
          merchant_account_id: searchParams.get('merchant_account_id') || ''
        }

        setPaymentDetails(details)

        // Verificar el estado del pago
        if (details.collection_status === 'approved' || details.status === 'approved') {
          // Pago exitoso - aquí podrías llamar a tu API para actualizar la suscripción
          console.log('Pago aprobado:', details)
        }

      } catch (err) {
        setError('Error al procesar los detalles del pago')
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPaymentDetails()
  }, [searchParams])

  const handleDownloadReceipt = () => {
    if (paymentDetails?.payment_id) {
      router.push(`/api/invoices/${paymentDetails.payment_id}`)
    }
  }

  const handleContinue = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Procesando información del pago...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
        <Navigation />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-red-600 mb-4">❌</div>
                <h1 className="text-xl font-bold mb-4">Error</h1>
                <p className="text-gray-600 mb-6">{error}</p>
                <Button onClick={() => router.push('/pagos')} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a Pagos
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Navigation />
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-800">
                ¡Pago Exitoso!
              </CardTitle>
              <p className="text-gray-600">
                Tu pago ha sido procesado correctamente
              </p>
            </CardHeader>

            <CardContent className="p-6">
              {paymentDetails && (
                <div className="space-y-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ID de Pago:</span>
                      <span className="font-mono text-xs">
                        {paymentDetails.payment_id || paymentDetails.collection_id}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Estado:</span>
                      <span className="font-medium text-green-600">
                        {paymentDetails.collection_status || paymentDetails.status}
                      </span>
                    </div>
                    {paymentDetails.external_reference && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Referencia:</span>
                        <span className="font-medium">
                          {paymentDetails.external_reference}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tipo de Pago:</span>
                      <span className="font-medium">
                        {paymentDetails.payment_type}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleDownloadReceipt}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar Comprobante
                </Button>

                <Button
                  onClick={handleContinue}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Ir al Dashboard
                </Button>

                <Button
                  onClick={() => router.push('/pagos')}
                  variant="ghost"
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a Pagos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Cargando...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
