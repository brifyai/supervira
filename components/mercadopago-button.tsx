
'use client'

import { toast } from 'react-toastify'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, CreditCard } from 'lucide-react'
import { useSupabaseUser } from '@/hooks/use-supabase-user'
interface MercadoPagoButtonProps {
  planId: string
  planName: string
  planPrice: number
  planDescription?: string
  onPaymentStart?: () => void
  onPaymentSuccess?: (paymentData: any) => void
  onPaymentError?: (error: string) => void
  disabled?: boolean
  className?: string
}

export function MercadoPagoButton({
  planId,
  planName,
  planPrice,
  planDescription,
  onPaymentStart,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  className
}: MercadoPagoButtonProps) {
  const [loading, setLoading] = useState(false)
  const { session } = useSupabaseUser()

  const handlePayment = async () => {
    if (!session?.user?.email) {
      toast.error('Debes iniciar sesión para realizar el pago')
      return
    }

    try {
      setLoading(true)
      onPaymentStart?.()

      // Crear preferencia de pago
      const response = await fetch('/api/payments/mercadopago/preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          planName,
          planPrice,
          planDescription,
          userEmail: session.user.email
        }),
      })

      if (!response.ok) {
        throw new Error('Error al crear la preferencia de pago')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error('Error al procesar el pago')
      }

      // Redirigir a MercadoPago
      const paymentUrl = process.env.NEXT_PUBLIC_MERCADOPAGO_ENVIRONMENT === 'production'
        ? data.init_point
        : data.sandbox_init_point

      if (paymentUrl) {
        // Abrir en nueva ventana o redirigir
        window.location.href = paymentUrl
      } else {
        throw new Error('No se pudo obtener la URL de pago')
      }

    } catch (error) {
      console.error('Error al procesar pago:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al procesar el pago'
      toast.error(errorMessage)
      onPaymentError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || loading}
      className={className}
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Procesando...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Pagar con MercadoPago
        </>
      )}
    </Button>
  )
}
