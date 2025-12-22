
import { mercadopagoPreference, mercadopagoPayment } from './mercadopago-config'

export interface CreatePreferenceParams {
  title: string
  description: string
  unit_price: number
  quantity: number
  currency_id?: string
  payer_email?: string
  external_reference?: string
  metadata?: Record<string, any>
}

export interface PaymentResponse {
  id: number | string
  status: string
  status_detail: string
  payment_method_id: string
  payment_type_id: string
  transaction_amount: number
  date_created: string
  date_approved?: string
  payer: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
  metadata?: Record<string, any>
}

export class MercadoPagoService {
  
  // Crear preferencia de pago
  static async createPreference(params: CreatePreferenceParams) {
    try {
      const preference = await mercadopagoPreference.create({
        body: {
          items: [
            {
              id: `item_${Date.now()}`,
              title: params.title,
              description: params.description,
              unit_price: params.unit_price,
              quantity: params.quantity,
              currency_id: params.currency_id || 'CLP'
            }
          ],
          payer: {
            email: params.payer_email || 'test@test.com'
          },
          back_urls: {
            success: process.env.NEXT_PUBLIC_APP_URL + '/pagos/exito',
            failure: process.env.NEXT_PUBLIC_APP_URL + '/pagos/error',
            pending: process.env.NEXT_PUBLIC_APP_URL + '/pagos/pendiente'
          },
          auto_return: 'approved' as const,
          external_reference: params.external_reference,
          metadata: params.metadata
        }
      })
      
      return {
        success: true,
        data: preference
      }
    } catch (error) {
      console.error('Error creating MercadoPago preference:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
  
  // Obtener información de un pago
  static async getPayment(paymentId: string) {
    try {
      const payment = await mercadopagoPayment.get({ id: paymentId })
      
      return {
        success: true,
        data: payment as any
      }
    } catch (error) {
      console.error('Error getting MercadoPago payment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
  
  // Procesar webhook de MercadoPago
  static async processWebhook(webhookData: any) {
    try {
      const { type, data } = webhookData
      
      if (type === 'payment') {
        const paymentId = data.id
        const paymentInfo = await this.getPayment(paymentId)
        
        if (paymentInfo.success) {
          // Aquí puedes agregar lógica para actualizar el estado de la suscripción
          // Por ejemplo, activar la suscripción del usuario, enviar email de confirmación, etc.
          
          return {
            success: true,
            payment: paymentInfo.data
          }
        }
      }
      
      return {
        success: false,
        error: 'Tipo de webhook no soportado'
      }
    } catch (error) {
      console.error('Error processing MercadoPago webhook:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
  
  // Crear suscripción (para pagos recurrentes)
  static async createSubscription(params: {
    planId: string
    payerEmail: string
    userId: string
  }) {
    // MercadoPago maneja suscripciones a través de preapproval
    // Esta es una implementación básica, podrías expandirla según tus necesidades
    
    try {
      const preference = await this.createPreference({
        title: `Suscripción Plan ${params.planId}`,
        description: `Suscripción mensual al plan ${params.planId}`,
        unit_price: 29990, // Precio ejemplo en CLP
        quantity: 1,
        payer_email: params.payerEmail,
        external_reference: `subscription_${params.userId}_${params.planId}`,
        metadata: {
          type: 'subscription',
          user_id: params.userId,
          plan_id: params.planId
        }
      })
      
      return preference
    } catch (error) {
      console.error('Error creating MercadoPago subscription:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}
