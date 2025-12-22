
import { NextRequest, NextResponse } from 'next/server'

const plans = [
  {
    id: 'free',
    name: 'Plan Gratuito',
    price: 0,
    currency: 'CLP',
    interval: 'month',
    features: [
      '5 noticieros por mes',
      '1 integración',
      'Soporte por email',
      '1GB almacenamiento'
    ],
    limits: {
      noticieros: 5,
      integraciones: 1,
      usuarios: 1,
      almacenamiento: 1024, // MB
      apiCalls: 100
    },
    popular: false
  },
  {
    id: 'basic',
    name: 'Plan Básico',
    price: 29900,
    currency: 'CLP',
    interval: 'month',
    features: [
      '100 noticieros por mes',
      '5 integraciones',
      'Soporte prioritario',
      '10GB almacenamiento',
      'Síntesis de voz premium'
    ],
    limits: {
      noticieros: 100,
      integraciones: 5,
      usuarios: 3,
      almacenamiento: 10240,
      apiCalls: 1000
    },
    popular: false
  },
  {
    id: 'pro',
    name: 'Plan Profesional',
    price: 59900,
    currency: 'CLP',
    interval: 'month',
    features: [
      'Noticieros ilimitados',
      'Todas las integraciones',
      'Soporte 24/7',
      '100GB almacenamiento',
      'API personalizada',
      'Múltiples usuarios'
    ],
    limits: {
      noticieros: -1,
      integraciones: -1,
      usuarios: 10,
      almacenamiento: 102400,
      apiCalls: 10000
    },
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Plan Empresarial',
    price: 149900,
    currency: 'CLP',
    interval: 'month',
    features: [
      'Todo el Plan Pro',
      'Usuarios ilimitados',
      'Almacenamiento ilimitado',
      'Soporte dedicado',
      'Implementación personalizada',
      'SLA garantizado',
      'Infraestructura dedicada'
    ],
    limits: {
      noticieros: -1,
      integraciones: -1,
      usuarios: -1,
      almacenamiento: -1,
      apiCalls: -1
    },
    popular: false
  }
]

const userSubscriptions = [
  {
    userId: '1',
    planId: 'pro',
    status: 'active',
    startDate: '2024-07-01T00:00:00Z',
    endDate: '2024-10-01T00:00:00Z',
    autoRenew: true,
    nextBilling: '2024-10-01T00:00:00Z',
    usage: {
      noticieros: 45,
      integraciones: 3,
      almacenamiento: 45600, // MB
      apiCalls: 2340
    }
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeUsage = searchParams.get('includeUsage') === 'true'
    
    // En desarrollo, simular usuario autenticado
    const mockSession = { user: { id: '1' } }
    
    if (!mockSession) {
      // Si no hay sesión, devolver solo los planes públicos
      return NextResponse.json({ plans })
    }

    let response: any = { plans }

    if (includeUsage) {
      // Obtener información de la suscripción del usuario
      const userId = '1' // En producción obtener del session
      const userSub = userSubscriptions.find(sub => sub.userId === userId)
      
      if (userSub) {
        const currentPlan = plans.find(plan => plan.id === userSub.planId)
        
        response.currentSubscription = {
          ...userSub,
          plan: currentPlan,
          usage: userSub.usage,
          usagePercentages: currentPlan ? calculateUsagePercentages(currentPlan.limits, userSub.usage) : null
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error obteniendo planes:', error)
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

    const { action, planId, autoRenew } = await request.json()

    const userId = '1' // En producción obtener del session

    switch (action) {
      case 'change_plan':
        return await changePlan(userId, planId)
      
      case 'cancel_subscription':
        return await cancelSubscription(userId)
      
      case 'update_auto_renew':
        return await updateAutoRenew(userId, autoRenew)
      
      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error procesando acción de plan:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

async function changePlan(userId: string, newPlanId: string) {
  const newPlan = plans.find(plan => plan.id === newPlanId)
  if (!newPlan) {
    return NextResponse.json(
      { error: 'Plan no encontrado' },
      { status: 404 }
    )
  }

  const userSub = userSubscriptions.find(sub => sub.userId === userId)
  if (!userSub) {
    return NextResponse.json(
      { error: 'Suscripción no encontrada' },
      { status: 404 }
    )
  }

  const currentPlan = plans.find(plan => plan.id === userSub.planId)
  
  // Calcular proration si es necesario
  const now = new Date()
  const endDate = new Date(userSub.endDate)
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  
  let prorationAmount = 0
  if (currentPlan && daysLeft > 0) {
    const dailyCurrentCost = currentPlan.price / 30
    const dailyNewCost = newPlan.price / 30
    prorationAmount = (dailyNewCost - dailyCurrentCost) * daysLeft
  }

  // Actualizar suscripción
  userSub.planId = newPlanId
  userSub.nextBilling = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString()

  return NextResponse.json({
    message: 'Plan actualizado exitosamente',
    subscription: userSub,
    newPlan,
    prorationAmount,
    effectiveDate: now.toISOString()
  })
}

async function cancelSubscription(userId: string) {
  const userSub = userSubscriptions.find(sub => sub.userId === userId)
  if (!userSub) {
    return NextResponse.json(
      { error: 'Suscripción no encontrada' },
      { status: 404 }
    )
  }

  userSub.status = 'cancelled'
  userSub.autoRenew = false

  return NextResponse.json({
    message: 'Suscripción cancelada. Mantendrás acceso hasta el final del período actual.',
    subscription: userSub,
    accessUntil: userSub.endDate
  })
}

async function updateAutoRenew(userId: string, autoRenew: boolean) {
  const userSub = userSubscriptions.find(sub => sub.userId === userId)
  if (!userSub) {
    return NextResponse.json(
      { error: 'Suscripción no encontrada' },
      { status: 404 }
    )
  }

  userSub.autoRenew = autoRenew

  return NextResponse.json({
    message: `Renovación automática ${autoRenew ? 'activada' : 'desactivada'}`,
    subscription: userSub
  })
}

function calculateUsagePercentages(limits: any, usage: any) {
  const percentages: any = {}
  
  Object.keys(usage).forEach(key => {
    if (limits[key] === -1) {
      percentages[key] = 0 // Ilimitado
    } else if (limits[key] > 0) {
      percentages[key] = Math.min(100, (usage[key] / limits[key]) * 100)
    }
  })
  
  return percentages
}
