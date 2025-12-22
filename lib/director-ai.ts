// ==================================================
// VIRA - IA Directora de Noticieros
// ==================================================
// Planifica la estructura óptima del noticiero:
// - Orden de noticias por impacto
// - Tiempo asignado a cada noticia
// - Ubicación de cortinas y publicidad
// ==================================================

import { logTokenUsage, calculateChutesAICost } from './usage-logger'
import { CHUTES_CONFIG, getChutesHeaders } from './chutes-config'
import { fetchWithRetry } from './utils'

// Tipos de entrada
export interface NoticiaParaDirector {
    id: string
    titulo: string
    categoria: string
    longitud_contenido: number  // Caracteres del contenido original
    importancia?: number        // 1-10, calculado por keywords/recencia
}

export interface PublicidadParaDirector {
    id: string
    nombre: string
    duracion_segundos: number
}

export interface DirectorInput {
    noticias: NoticiaParaDirector[]
    duracion_objetivo_segundos: number
    publicidades: PublicidadParaDirector[]
    cortinas_enabled: boolean
    wpm: number  // Palabras por minuto de la voz
}

// Tipos de salida
export interface AsignacionNoticia {
    id: string
    orden: number
    segundos_asignados: number
    palabras_objetivo: number
    es_destacada: boolean
}

export interface Insercion {
    despues_de_orden: number
    tipo: 'cortina' | 'publicidad'
    publicidad_id?: string
    duracion_segundos: number
}

export interface PlanNoticiero {
    noticias: AsignacionNoticia[]
    inserciones: Insercion[]
    intro_palabras: number
    cierre_palabras: number
    duracion_total_estimada: number
}

// Prompt del sistema para la IA Directora
const DIRECTOR_SYSTEM_PROMPT = `Eres el director de un noticiero de radio profesional en Chile.
Tu trabajo es planificar la estructura óptima del noticiero para maximizar el impacto y llenar exactamente el tiempo objetivo.

REGLAS DE PLANIFICACIÓN:
1. ORDEN: Organiza las noticias para máximo impacto narrativo
   - Empezar con noticia fuerte de interés general
   - Agrupar temas relacionados pero variar para mantener atención
   - Cerrar con noticia memorable o reflexiva

2. DISTRIBUCIÓN DE TIEMPO:
   - Noticias más importantes: más tiempo (hasta 40% más que el promedio)
   - Noticias secundarias: tiempo estándar
   - El total DEBE sumar aproximadamente el tiempo objetivo

3. CORTINAS (separadores de audio):
   - Insertar en cambios de categoría importantes
   - No más de 3-4 cortinas por noticiero
   - Duración: 5 segundos cada una

4. PUBLICIDAD:
   - Distribuir uniformemente (no juntas)
   - Primera publicidad: después del 30% del noticiero
   - Última publicidad: antes del 85% del noticiero

5. INTRO Y CIERRE:
   - Intro: 30-50 palabras (saludo, hora, resumen)
   - Cierre: 40-80 palabras (despedida, anticipar siguiente edición)

Responde ÚNICAMENTE con JSON válido, sin explicaciones ni markdown.`

/**
 * Genera el plan del noticiero usando IA
 */
export async function planificarNoticiero(
    input: DirectorInput,
    userId?: string
): Promise<PlanNoticiero> {
    console.log(`🎬 === IA DIRECTORA ===`)
    console.log(`   📰 Noticias: ${input.noticias.length}`)
    console.log(`   ⏱️ Duración objetivo: ${input.duracion_objetivo_segundos}s (${Math.round(input.duracion_objetivo_segundos / 60)}min)`)
    console.log(`   📢 Publicidades: ${input.publicidades.length}`)
    console.log(`   🎵 Cortinas: ${input.cortinas_enabled ? 'Sí' : 'No'}`)

    // Calcular tiempo disponible para noticias
    const tiempoPublicidad = input.publicidades.reduce((sum, p) => sum + p.duracion_segundos, 0)
    const tiempoIntroOutro = 45 // ~45 segundos para intro y cierre
    const tiempoCortinas = 0 // Cortinas se manejan via audio-placement.ts (no placeholders)
    const tiempoParaNoticias = input.duracion_objetivo_segundos - tiempoPublicidad - tiempoIntroOutro - tiempoCortinas

    const userPrompt = `Planifica este noticiero:

NOTICIAS DISPONIBLES:
${input.noticias.map((n, i) => `${i + 1}. [${n.categoria}] "${n.titulo}" (contenido: ${n.longitud_contenido} caracteres)`).join('\n')}

CONFIGURACIÓN:
- Duración total objetivo: ${input.duracion_objetivo_segundos} segundos (${Math.round(input.duracion_objetivo_segundos / 60)} minutos)
- Tiempo disponible para noticias: ~${tiempoParaNoticias} segundos
- Velocidad de lectura: ${input.wpm} palabras por minuto
- Publicidades a insertar: ${input.publicidades.length} (${input.publicidades.map(p => `"${p.nombre}" ${p.duracion_segundos}s`).join(', ') || 'ninguna'})
- Cortinas habilitadas: ${input.cortinas_enabled ? 'Sí (gestionadas por audio-placement)' : 'No'}

Responde con este JSON exacto:
{
  "noticias": [
    {"id": "id_noticia", "orden": 1, "segundos_asignados": 90, "palabras_objetivo": 225, "es_destacada": true}
  ],
  "inserciones": [
    {"despues_de_orden": 3, "tipo": "publicidad", "publicidad_id": "id_pub", "duracion_segundos": 25}
  ],
  "intro_palabras": 45,
  "cierre_palabras": 60,
  "duracion_total_estimada": ${input.duracion_objetivo_segundos}
}`

    try {
        // ✅ Delay antes de llamar a la IA para evitar 429 en producción
        await new Promise(resolve => setTimeout(resolve, 2000))

        const response = await fetchWithRetry(
            CHUTES_CONFIG.endpoints.chatCompletions,
            {
                method: 'POST',
                headers: getChutesHeaders(),
                body: JSON.stringify({
                    model: CHUTES_CONFIG.model,
                    messages: [
                        { role: 'system', content: DIRECTOR_SYSTEM_PROMPT },
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: 1500,
                    temperature: 0.3  // Baja temperatura para respuestas consistentes
                })
            },
            3
        )

        if (!response.ok) {
            throw new Error(`Error API: ${response.status}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content?.trim()

        // Calcular tokens y registrar
        const inputTokens = Math.ceil((DIRECTOR_SYSTEM_PROMPT.length + userPrompt.length) / 4)
        const outputTokens = Math.ceil((content?.length || 0) / 4)
        const totalTokens = inputTokens + outputTokens
        const cost = calculateChutesAICost(totalTokens)

        await logTokenUsage({
            user_id: userId,
            servicio: 'chutes',
            operacion: 'director',
            tokens_usados: totalTokens,
            costo: cost,
            metadata: {
                noticias_count: input.noticias.length,
                duracion_objetivo: input.duracion_objetivo_segundos,
                publicidades_count: input.publicidades.length
            }
        })

        // Parsear JSON de la respuesta
        let plan: PlanNoticiero

        // Verificar que hay contenido antes de parsear
        if (!content) {
            console.log('⚠️ IA Directora devolvió respuesta vacía, usando fallback')
            return generarPlanFallback(input)
        }

        try {
            // Limpiar posible markdown
            const cleanContent = content
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()

            plan = JSON.parse(cleanContent)
            console.log(`✅ Plan generado: ${plan.noticias.length} noticias ordenadas`)
        } catch (parseError) {
            console.error('❌ Error parseando respuesta de IA Directora:', parseError)
            console.log('Contenido recibido:', content?.substring(0, 500))

            // Fallback: plan básico matemático
            plan = generarPlanFallback(input)
        }

        // Validar y ajustar el plan
        plan = validarYAjustarPlan(plan, input)

        return plan

    } catch (error) {
        console.error('❌ Error en IA Directora:', error)
        // Fallback a plan matemático
        return generarPlanFallback(input)
    }
}

/**
 * Genera un plan básico si la IA falla
 */
function generarPlanFallback(input: DirectorInput): PlanNoticiero {
    console.log('⚠️ Usando plan fallback (matemático)')

    const tiempoPublicidad = input.publicidades.reduce((sum, p) => sum + p.duracion_segundos, 0)
    const tiempoParaNoticias = input.duracion_objetivo_segundos - 45 - tiempoPublicidad
    const segundosPorNoticia = Math.floor(tiempoParaNoticias / input.noticias.length)
    const palabrasPorNoticiaBase = Math.round((segundosPorNoticia / 60) * input.wpm)

    // ✅ MEJORA: Considerar longitud del contenido real
    // Primero calcular máximo de palabras posibles por noticia
    const noticiasConMaximo = input.noticias.map(n => {
        // ~5 caracteres por palabra en español
        const maxPalabrasReales = Math.floor(n.longitud_contenido / 5)
        const palabrasAsignadas = Math.min(palabrasPorNoticiaBase, maxPalabrasReales)
        return {
            ...n,
            palabrasAsignadas,
            deficit: palabrasPorNoticiaBase - palabrasAsignadas
        }
    })

    // Redistribuir déficit a las noticias que pueden absorberlo
    let deficitTotal = noticiasConMaximo.reduce((sum, n) => sum + Math.max(0, n.deficit), 0)
    const noticiasConCapacidad = noticiasConMaximo.filter(n => n.deficit <= 0).length

    if (noticiasConCapacidad > 0 && deficitTotal > 0) {
        const extraPorNoticia = Math.floor(deficitTotal / noticiasConCapacidad)
        noticiasConMaximo.forEach(n => {
            if (n.deficit <= 0) {
                n.palabrasAsignadas += extraPorNoticia
            }
        })
    }

    const noticias: AsignacionNoticia[] = noticiasConMaximo.map((n, i) => ({
        id: n.id,
        orden: i + 1,
        segundos_asignados: Math.round((n.palabrasAsignadas / input.wpm) * 60),
        palabras_objetivo: n.palabrasAsignadas,
        es_destacada: i === 0 || i === input.noticias.length - 1
    }))

    // Insertar publicidades distribuidas
    const inserciones: Insercion[] = []
    if (input.publicidades.length > 0) {
        const intervalo = Math.floor(input.noticias.length / (input.publicidades.length + 1))
        input.publicidades.forEach((pub, i) => {
            inserciones.push({
                despues_de_orden: (i + 1) * intervalo,
                tipo: 'publicidad',
                publicidad_id: pub.id,
                duracion_segundos: pub.duracion_segundos
            })
        })
    }

    // NOTA: Las cortinas se manejan via audio-placement.ts usando audios de la biblioteca
    // No generamos placeholders aquí para evitar duplicados

    return {
        noticias,
        inserciones: inserciones.sort((a, b) => a.despues_de_orden - b.despues_de_orden),
        intro_palabras: 45,
        cierre_palabras: 60,
        duracion_total_estimada: input.duracion_objetivo_segundos
    }
}

/**
 * Valida y ajusta el plan para asegurar coherencia
 */
function validarYAjustarPlan(plan: PlanNoticiero, input: DirectorInput): PlanNoticiero {
    // Asegurar que todas las noticias estén incluidas
    const idsEnPlan = new Set(plan.noticias.map(n => n.id))
    const idsInput = new Set(input.noticias.map(n => n.id))

    // Agregar noticias faltantes
    let maxOrden = Math.max(...plan.noticias.map(n => n.orden), 0)
    for (const noticia of input.noticias) {
        if (!idsEnPlan.has(noticia.id)) {
            maxOrden++
            plan.noticias.push({
                id: noticia.id,
                orden: maxOrden,
                segundos_asignados: 60,
                palabras_objetivo: input.wpm,
                es_destacada: false
            })
        }
    }

    // Ordenar por orden
    plan.noticias.sort((a, b) => a.orden - b.orden)

    // Asegurar que las palabras objetivo sean razonables
    const minPalabras = 80
    const maxPalabras = 600
    for (const noticia of plan.noticias) {
        noticia.palabras_objetivo = Math.max(minPalabras, Math.min(maxPalabras, noticia.palabras_objetivo))
    }

    // Recalcular duración total
    const duracionNoticias = plan.noticias.reduce((sum, n) => sum + n.segundos_asignados, 0)
    const duracionInserciones = plan.inserciones.reduce((sum, i) => sum + i.duracion_segundos, 0)
    const duracionIntroOutro = Math.round((plan.intro_palabras + plan.cierre_palabras) / input.wpm * 60)

    plan.duracion_total_estimada = duracionNoticias + duracionInserciones + duracionIntroOutro

    console.log(`📊 Plan validado:`)
    console.log(`   📰 ${plan.noticias.length} noticias`)
    console.log(`   🎵 ${plan.inserciones.filter(i => i.tipo === 'cortina').length} cortinas`)
    console.log(`   📢 ${plan.inserciones.filter(i => i.tipo === 'publicidad').length} publicidades`)
    console.log(`   ⏱️ Duración estimada: ${plan.duracion_total_estimada}s`)

    return plan
}

/**
 * Calcula la importancia de una noticia basándose en keywords
 */
export function calcularImportancia(titulo: string, categoria: string): number {
    let importancia = 5 // Base

    // Keywords de alta importancia
    const altaImportancia = ['urgente', 'última hora', 'breaking', 'importante', 'alerta',
        'presidente', 'gobierno', 'crisis', 'emergencia', 'muertos']

    const tituloLower = titulo.toLowerCase()
    for (const keyword of altaImportancia) {
        if (tituloLower.includes(keyword)) {
            importancia += 2
        }
    }

    // Categorías importantes
    if (['Política', 'Economía', 'Nacionales'].includes(categoria)) {
        importancia += 1
    }

    return Math.min(10, importancia)
}
