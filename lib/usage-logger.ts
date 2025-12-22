import { supabase } from './supabase'

/**
 * Interfaz para registrar uso de tokens/costos de servicios de IA
 */
interface TokenUsage {
    user_id?: string
    servicio: 'chutes' | 'abacus' | 'groq' | 'openai' | 'elevenlabs' | 'azure' | 'local-tts'
    operacion: 'humanizacion' | 'humanizacion_reprocess' | 'humanizacion_anti_repeticion' | 'cierre_extendido' | 'procesamiento_texto' | 'tts' | 'scraping' | 'audio_placement' | 'director'
    tokens_usados: number
    costo: number
    moneda?: string
    metadata?: Record<string, any>
}

/**
 * Registra el uso de tokens en la tabla uso_tokens
 */
export async function logTokenUsage(usage: TokenUsage): Promise<void> {
    try {
        const { error } = await supabase.from('uso_tokens').insert({
            user_id: usage.user_id || null,
            servicio: usage.servicio,
            operacion: usage.operacion,
            tokens_usados: usage.tokens_usados,
            costo: usage.costo,
            moneda: usage.moneda || 'USD',
            metadata: usage.metadata || {},
            created_at: new Date().toISOString()
        })

        if (error) {
            console.error('❌ Error logging token usage:', error)
        } else {
            console.log(`✅ Token usage logged: ${usage.servicio} - ${usage.tokens_usados} tokens - $${usage.costo.toFixed(4)}`)
        }
    } catch (error) {
        console.error('❌ Error logging token usage:', error)
    }
}

/**
 * Calcula el costo de tokens para Chutes AI
 * Basado en el modelo openai/gpt-oss-120b
 */
export function calculateChutesAICost(totalTokens: number): number {
    // Costo aproximado: $0.50 por 1M tokens
    const costPerMillionTokens = 0.50
    return (totalTokens / 1_000_000) * costPerMillionTokens
}

/**
 * Calcula el costo de tokens para Abacus AI
 */
export function calculateAbacusAICost(totalTokens: number, model: string = 'gpt-4.1-mini'): number {
    // Costos aproximados por modelo
    const costs: Record<string, number> = {
        'gpt-4.1-mini': 0.30, // $0.30 por 1M tokens
        'gpt-4': 30.00,       // $30 por 1M tokens
        'gpt-3.5-turbo': 0.50 // $0.50 por 1M tokens
    }

    const costPerMillionTokens = costs[model] || 0.30
    return (totalTokens / 1_000_000) * costPerMillionTokens
}

/**
 * Calcula el costo de tokens para Groq
 */
export function calculateGroqCost(totalTokens: number): number {
    // Groq es muy económico: $0.10 por 1M tokens
    const costPerMillionTokens = 0.10
    return (totalTokens / 1_000_000) * costPerMillionTokens
}

/**
 * Obtiene métricas de uso de tokens del período actual
 */
export async function getTokenUsageMetrics(
    startDate?: Date,
    endDate?: Date,
    userId?: string
) {
    try {
        const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        const end = endDate || new Date()

        let query = supabase
            .from('uso_tokens')
            .select('*')
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString())

        if (userId) {
            query = query.eq('user_id', userId)
        }

        const { data, error } = await query

        if (error) throw error

        // Calcular métricas agregadas
        const metrics = {
            total_tokens: data?.reduce((sum, row) => sum + (row.tokens_usados || 0), 0) || 0,
            total_cost: data?.reduce((sum, row) => sum + (row.costo || 0), 0) || 0,
            by_service: {} as Record<string, { tokens: number; cost: number; count: number }>,
            by_operation: {} as Record<string, { tokens: number; cost: number; count: number }>,
            total_requests: data?.length || 0
        }

        // Agrupar por servicio
        data?.forEach(row => {
            const service = row.servicio
            if (!metrics.by_service[service]) {
                metrics.by_service[service] = { tokens: 0, cost: 0, count: 0 }
            }
            metrics.by_service[service].tokens += row.tokens_usados || 0
            metrics.by_service[service].cost += row.costo || 0
            metrics.by_service[service].count += 1

            // Agrupar por operación
            const operation = row.operacion
            if (!metrics.by_operation[operation]) {
                metrics.by_operation[operation] = { tokens: 0, cost: 0, count: 0 }
            }
            metrics.by_operation[operation].tokens += row.tokens_usados || 0
            metrics.by_operation[operation].cost += row.costo || 0
            metrics.by_operation[operation].count += 1
        })

        return metrics
    } catch (error) {
        console.error('Error getting token usage metrics:', error)
        return {
            total_tokens: 0,
            total_cost: 0,
            by_service: {},
            by_operation: {},
            total_requests: 0
        }
    }
}
