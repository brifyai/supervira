
import 'server-only';

import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'

// Configuración del cliente de MercadoPago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  options: {
    timeout: 5000,
    idempotencyKey: 'abc'
  }
})

// Instancias de los servicios de MercadoPago
export const mercadopagoPayment = new Payment(client)
export const mercadopagoPreference = new Preference(client)

// Configuración de MercadoPago
export const mercadopagoConfig = {
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || '',
  clientId: process.env.MERCADOPAGO_CLIENT_ID || '',
  clientSecret: process.env.MERCADOPAGO_CLIENT_SECRET || '',
  webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET || '',
  environment: (process.env.MERCADOPAGO_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',

  // URLs de retorno
  urls: {
    success: `${process.env.NEXT_PUBLIC_APP_URL}/pagos/exito`,
    failure: `${process.env.NEXT_PUBLIC_APP_URL}/pagos/error`,
    pending: `${process.env.NEXT_PUBLIC_APP_URL}/pagos/pendiente`,
    webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`
  }
}

// Validar configuración
export const validateMercadoPagoConfig = () => {
  const requiredVars = [
    'MERCADOPAGO_ACCESS_TOKEN',
    'MERCADOPAGO_PUBLIC_KEY'
  ]

  const missing = requiredVars.filter(varName => !process.env[varName])

  if (missing.length > 0) {
    throw new Error(`Variables de entorno faltantes para MercadoPago: ${missing.join(', ')}`)
  }

  return true
}
