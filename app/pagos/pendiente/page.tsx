
'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, ArrowLeft, RefreshCw, Loader2, AlertTriangle } from 'lucide-react'

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

function PaymentPendingContent() {
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

        console.log('Pago pendiente:', details)

      } catch (err) {
        setError('Error al procesar los detalles del pago')
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPaymentDetails()
  }, [searchParams])

  const checkPaymentStatus = async () => {
    if (!paymentDetails?.payment_id) return

    setLoading(true)
    try {
      // Aquí podrías implementar una consulta al estado del pago
      // Por ahora simularemos una consulta
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Recargar la página para verificar el estado
      window.location.reload()

    } catch (error) {
      console.error('Error al verificar estado del pago:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100">
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
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100">
      <Navigation />
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-yellow-800">
                Pago Pendiente
              </CardTitle>
              <p className="text-gray-600">
                Tu pago está siendo procesado
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
                      <span className="font-medium text-yellow-600">
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

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">¿Qué significa esto?</h4>
                    <p className="text-sm text-yellow-700">
                      Tu pago está siendo procesado por el banco o medio de pago seleccionado.
                      Esto puede tomar algunos minutos o hasta 24 horas dependiendo del método de pago utilizado.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={checkPaymentStatus}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Verificar Estado
                </Button>

                <Button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
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

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Te mantendremos informado</h4>
                <p className="text-sm text-blue-700">
                  Recibirás una notificación por email tan pronto como se confirme tu pago.
                  Una vez confirmado, tu suscripción se activará automáticamente.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100">
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
      <PaymentPendingContent />
    </Suspense>
  )
}
