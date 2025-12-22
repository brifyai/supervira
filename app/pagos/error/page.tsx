
'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react'

function PaymentErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [errorDetails, setErrorDetails] = useState<Record<string, string>>({})

  useEffect(() => {
    const details: Record<string, string> = {}

    // Capturar todos los parámetros de la URL
    for (const [key, value] of searchParams.entries()) {
      details[key] = value
    }

    setErrorDetails(details)

    console.log('Detalles del error de pago:', details)
  }, [searchParams])

  const getErrorMessage = () => {
    const status = errorDetails.collection_status || errorDetails.status

    switch (status) {
      case 'rejected':
        return 'El pago fue rechazado. Verifica los datos de tu tarjeta e intenta nuevamente.'
      case 'cancelled':
        return 'El pago fue cancelado.'
      case 'pending':
        return 'El pago está pendiente de aprobación.'
      default:
        return 'Hubo un problema al procesar tu pago. Por favor intenta nuevamente.'
    }
  }

  const handleRetry = () => {
    router.push('/pagos')
  }

  const handleGoHome = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
      <Navigation />
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-800">
                Pago No Completado
              </CardTitle>
              <p className="text-gray-600">
                {getErrorMessage()}
              </p>
            </CardHeader>

            <CardContent className="p-6">
              {Object.keys(errorDetails).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                  <h4 className="font-medium text-gray-800 mb-2">Detalles del Error:</h4>
                  {errorDetails.collection_id && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ID de Transacción:</span>
                      <span className="font-mono text-xs">
                        {errorDetails.collection_id}
                      </span>
                    </div>
                  )}
                  {(errorDetails.collection_status || errorDetails.status) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Estado:</span>
                      <span className="font-medium text-red-600">
                        {errorDetails.collection_status || errorDetails.status}
                      </span>
                    </div>
                  )}
                  {errorDetails.external_reference && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Referencia:</span>
                      <span className="font-medium">
                        {errorDetails.external_reference}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleRetry}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Intentar Nuevamente
                </Button>

                <Button
                  onClick={handleGoHome}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Ir al Dashboard
                </Button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">¿Necesitas Ayuda?</h4>
                <p className="text-sm text-blue-700">
                  Si continúas teniendo problemas con tu pago, contacta nuestro soporte técnico.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-blue-600"
                  onClick={() => router.push('/contacto')}
                >
                  Contactar Soporte
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function PaymentErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
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
      <PaymentErrorContent />
    </Suspense>
  )
}
