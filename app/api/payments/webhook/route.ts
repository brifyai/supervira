
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const signature = request.headers.get('x-signature')
    const requestId = request.headers.get('x-request-id')
    
    console.log('MercadoPago Webhook:', {
      body,
      signature,
      requestId,
      timestamp: new Date().toISOString()
    })

    // En desarrollo, simplemente loggeamos
    if (process.env.NODE_ENV === 'development') {
      console.log('Webhook MercadoPago (DEV):', JSON.stringify(body, null, 2))
      return NextResponse.json({ received: true })
    }

    // Verificar la firma del webhook (solo en producción)
    /*
    const expectedSignature = generateSignature(body, process.env.MERCADOPAGO_WEBHOOK_SECRET)
    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    */

    // Procesar diferentes tipos de notificación
    if (body.type === 'payment') {
      await handlePaymentNotification(body.data.id)
    } else if (body.type === 'merchant_order') {
      await handleMerchantOrderNotification(body.data.id)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Error procesando webhook MP:', error)
    return NextResponse.json(
      { error: 'Error procesando webhook' },
      { status: 500 }
    )
  }
}

async function handlePaymentNotification(paymentId: string) {
  try {
    console.log(`Procesando notificación de pago: ${paymentId}`)
    
    // En producción, aquí obtendrías los detalles del pago desde MP
    /*
    const mercadopago = require('mercadopago')
    const payment = await mercadopago.payment.findById(paymentId)
    
    // Actualizar el estado del pago en tu base de datos
    await updatePaymentStatus({
      id: payment.external_reference,
      status: payment.status,
      amount: payment.transaction_amount,
      mpPaymentId: paymentId
    })
    
    // Si el pago fue aprobado, activar la suscripción
    if (payment.status === 'approved') {
      await activateUserSubscription(payment.external_reference)
    }
    */
    
  } catch (error) {
    console.error('Error procesando notificación de pago:', error)
    throw error
  }
}

async function handleMerchantOrderNotification(orderId: string) {
  try {
    console.log(`Procesando orden de merchant: ${orderId}`)
    
    // Lógica para manejar órdenes de merchant
    
  } catch (error) {
    console.error('Error procesando orden de merchant:', error)
    throw error
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'MercadoPago Webhook Endpoint',
    timestamp: new Date().toISOString() 
  })
}
