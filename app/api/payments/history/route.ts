
import { NextRequest, NextResponse } from 'next/server'

// Simulación de historial de pagos
const paymentHistory = [
  {
    id: 'pay_001',
    userId: '1',
    date: '2024-09-01T10:00:00Z',
    amount: 59900,
    currency: 'CLP',
    method: 'mercadopago',
    status: 'completed',
    description: 'Plan Profesional - Septiembre 2024',
    planId: 'pro',
    invoiceUrl: '/api/invoices/001.pdf',
    mpPaymentId: 'MP123456789',
    externalReference: 'vira-pro-1693555200000'
  },
  {
    id: 'pay_002',
    userId: '1',
    date: '2024-08-01T10:00:00Z',
    amount: 59900,
    currency: 'CLP',
    method: 'transfer',
    status: 'completed',
    description: 'Plan Profesional - Agosto 2024',
    planId: 'pro',
    invoiceUrl: '/api/invoices/002.pdf',
    transferReference: 'VIRA-PRO-123456'
  },
  {
    id: 'pay_003',
    userId: '1',
    date: '2024-07-01T10:00:00Z',
    amount: 59900,
    currency: 'CLP',
    method: 'mercadopago',
    status: 'pending',
    description: 'Plan Profesional - Julio 2024',
    planId: 'pro',
    mpPaymentId: 'MP987654321',
    externalReference: 'vira-pro-1690891200000'
  },
  {
    id: 'pay_004',
    userId: '1',
    date: '2024-06-01T10:00:00Z',
    amount: 29900,
    currency: 'CLP',
    method: 'mercadopago',
    status: 'completed',
    description: 'Plan Básico - Junio 2024',
    planId: 'basic',
    invoiceUrl: '/api/invoices/004.pdf',
    mpPaymentId: 'MP555444333'
  }
]

const subscriptions = [
  {
    userId: '1',
    planId: 'pro',
    status: 'active',
    startDate: '2024-07-01T10:00:00Z',
    endDate: '2024-10-01T10:00:00Z',
    autoRenew: true,
    nextBilling: '2024-10-01T10:00:00Z'
  }
]

export async function GET(request: NextRequest) {
  try {
    // En desarrollo, simular usuario autenticado
    const mockSession = { user: { id: '1' } }
    
    if (!mockSession) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')

    // En producción, obtener el userId del usuario autenticado
    const userId = '1' // Mock

    let userPayments = paymentHistory.filter(payment => payment.userId === userId)

    // Filtrar por status si se proporciona
    if (status && status !== 'all') {
      userPayments = userPayments.filter(payment => payment.status === status)
    }

    // Ordenar por fecha descendente
    userPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Paginación
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedPayments = userPayments.slice(startIndex, endIndex)

    // Obtener información de la suscripción actual
    const currentSubscription = subscriptions.find(sub => sub.userId === userId && sub.status === 'active')

    return NextResponse.json({
      payments: paginatedPayments,
      pagination: {
        page,
        limit,
        total: userPayments.length,
        totalPages: Math.ceil(userPayments.length / limit)
      },
      subscription: currentSubscription,
      summary: {
        totalPaid: userPayments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + p.amount, 0),
        totalPending: userPayments
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + p.amount, 0),
        lastPayment: userPayments.find(p => p.status === 'completed')
      }
    })

  } catch (error) {
    console.error('Error obteniendo historial de pagos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // En desarrollo, simular usuario autenticado
    const mockSession = { user: { id: '1' } }
    
    if (!mockSession) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { planId, method, billingData } = await request.json()

    // Validaciones
    if (!planId || !method) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    const plans = {
      basic: { name: 'Plan Básico', price: 29900 },
      pro: { name: 'Plan Profesional', price: 59900 },
      enterprise: { name: 'Plan Empresarial', price: 149900 }
    }

    const selectedPlan = plans[planId as keyof typeof plans]
    if (!selectedPlan) {
      return NextResponse.json(
        { error: 'Plan no válido' },
        { status: 400 }
      )
    }

    const userId = '1' // Mock
    const paymentId = `pay_${Date.now()}`
    const externalReference = `vira-${planId}-${Date.now()}`

    const newPayment: any = {
      id: paymentId,
      userId,
      date: new Date().toISOString(),
      amount: selectedPlan.price,
      currency: 'CLP',
      method,
      status: method === 'transfer' ? 'pending' : 'processing',
      description: `${selectedPlan.name} - ${new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`,
      planId,
      externalReference,
      ...(method === 'mercadopago' && {
        mpPaymentId: 'MP-' + Date.now(),
        invoiceUrl: ''
      }),
      ...(method === 'transfer' && {
        transferReference: externalReference
      }),
      billingData
    }

    // Agregar al historial (en producción sería guardado en BD)
    paymentHistory.unshift(newPayment)

    if (method === 'transfer') {
      return NextResponse.json({
        payment: newPayment,
        transferData: {
          reference: externalReference,
          amount: selectedPlan.price * 1.19, // Con IVA
          bankAccounts: [
            {
              bank: 'Banco de Chile',
              accountType: 'Cuenta Corriente',
              accountNumber: '12345678-9',
              rut: '76.123.456-7'
            }
          ]
        }
      })
    }

    // Para otros métodos de pago
    return NextResponse.json({
      payment: newPayment,
      redirectUrl: method === 'mercadopago' ? '/api/payments/redirect-mp' : null
    })

  } catch (error) {
    console.error('Error creando pago:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
