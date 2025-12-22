
import { NextRequest, NextResponse } from 'next/server'

// Esta sería la configuración real de MercadoPago
// const mercadopago = require('mercadopago')
// mercadopago.configure({
//   access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
// })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar datos requeridos
    if (!body.items || !body.items.length || !body.payer) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // En desarrollo, devolvemos una respuesta simulada
    if (process.env.NODE_ENV === 'development') {
      const mockPreference = {
        id: `MP-PREF-${Date.now()}`,
        init_point: `https://www.mercadopago.com.cl/checkout/v1/redirect?pref_id=MP-PREF-${Date.now()}`,
        sandbox_init_point: `https://sandbox.mercadopago.com.cl/checkout/v1/redirect?pref_id=MP-PREF-${Date.now()}`,
        auto_return: 'approved'
      }
      
      return NextResponse.json(mockPreference)
    }

    // Configuración real para producción
    /*
    const preference = {
      items: body.items.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        unit_price: item.unit_price,
        quantity: item.quantity,
        currency_id: 'CLP'
      })),
      payer: {
        name: body.payer.name,
        surname: body.payer.surname || '',
        email: body.payer.email,
        phone: body.payer.phone || {},
        identification: body.payer.identification || {},
        address: body.payer.address || {}
      },
      back_urls: {
        success: body.back_urls?.success || `${process.env.NEXTAUTH_URL}/pagos/exito`,
        failure: body.back_urls?.failure || `${process.env.NEXTAUTH_URL}/pagos/error`,
        pending: body.back_urls?.pending || `${process.env.NEXTAUTH_URL}/pagos/pendiente`
      },
      auto_return: body.auto_return || 'approved',
      payment_methods: {
        excluded_payment_methods: [
          {
            id: 'amex'
          }
        ],
        excluded_payment_types: [],
        installments: 12
      },
      notification_url: `${process.env.NEXTAUTH_URL}/api/payments/webhook`,
      external_reference: body.external_reference
    }

    const response = await mercadopago.preferences.create(preference)
    return NextResponse.json(response.body)
    */

    // Por ahora devolvemos mock
    return NextResponse.json({
      error: 'MercadoPago no configurado en producción'
    }, { status: 501 })

  } catch (error) {
    console.error('Error creando preferencia MP:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
