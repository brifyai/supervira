/**
 * API: /api/fuentes
 * Gestión de fuentes de noticias con modelo de suscripciones compartidas
 * 
 * GET: Retorna las fuentes suscritas por el usuario actual (o su admin)
 * POST: Suscribe a una fuente existente o crea nueva + suscribe
 * DELETE: Elimina suscripción (no la fuente si otros la usan)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase-auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getResourceOwnerId, canModifyResources } from '@/lib/resource-owner'

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const region = searchParams.get('region')

        // Obtener el owner (admin_id para sub-usuarios)
        const ownerId = getResourceOwnerId(user)

        // Obtener fuentes suscritas con JOIN
        const { data: suscripciones, error } = await supabaseAdmin
            .from('user_fuentes_suscripciones')
            .select(`
                id,
                categoria,
                esta_activo,
                created_at,
                fuente:fuentes_final (
                    id,
                    nombre_fuente,
                    url,
                    rss_url,
                    region,
                    esta_activo
                )
            `)
            .eq('user_id', ownerId)
            .eq('esta_activo', true)

        if (error) {
            console.error('Error obteniendo fuentes:', error)
            return NextResponse.json(
                { error: 'Error obteniendo fuentes', details: error.message },
                { status: 500 }
            )
        }

        // Formatear respuesta
        const fuentes = (suscripciones as any[])?.map(s => ({
            id: s.fuente?.id,
            suscripcion_id: s.id,
            nombre_fuente: s.fuente?.nombre_fuente,
            url: s.fuente?.url,
            rss_url: s.fuente?.rss_url,
            region: s.fuente?.region,
            categoria: s.categoria,
            esta_activo: s.fuente?.esta_activo
        })).filter(f => f.id) || []

        // Filtrar por región si se especifica
        const fuentesFiltradas = region
            ? fuentes.filter(f => f.region === region)
            : fuentes

        return NextResponse.json({
            success: true,
            data: fuentesFiltradas,  // Mantener 'data' para compatibilidad
            fuentes: fuentesFiltradas,
            count: fuentesFiltradas.length
        })

    } catch (error) {
        console.error('Error en GET /api/fuentes:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        // Solo admin y super_admin pueden agregar fuentes
        if (!canModifyResources(user)) {
            return NextResponse.json(
                { error: 'No tienes permisos para agregar fuentes' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { nombre_fuente, url, rss_url, region, categoria } = body

        if (!nombre_fuente || !url || !region) {
            return NextResponse.json(
                { error: 'Faltan campos: nombre_fuente, url, region' },
                { status: 400 }
            )
        }

        if (!url.includes('http')) {
            return NextResponse.json(
                { error: 'La URL debe incluir http:// o https://' },
                { status: 400 }
            )
        }

        // ✅ NUEVO: Función para normalizar URLs (evitar duplicados por trailing slash, etc)
        const normalizeUrl = (inputUrl: string): string => {
            try {
                let normalized = inputUrl.trim().toLowerCase()

                // Asegurar protocolo
                if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
                    normalized = 'https://' + normalized
                }

                const urlObj = new URL(normalized)

                // Remover trailing slash del pathname
                let path = urlObj.pathname.replace(/\/+$/, '')
                if (path === '') path = ''

                // Reconstruir URL normalizada
                return `${urlObj.protocol}//${urlObj.hostname}${path}`.toLowerCase()
            } catch {
                return inputUrl.trim().replace(/\/+$/, '').toLowerCase()
            }
        }

        const normalizedUrl = normalizeUrl(url)
        const hostname = new URL(normalizedUrl).hostname

        const ownerId = getResourceOwnerId(user)

        // 1. Buscar si la fuente ya existe por hostname (más flexible que URL exacta)
        const { data: existingFuentes } = await supabaseAdmin
            .from('fuentes_final')
            .select('id, url, nombre_fuente')
            .ilike('url', `%${hostname}%`)

        // Buscar coincidencia exacta después de normalizar
        const existingFuente = existingFuentes?.find(f => normalizeUrl(f.url) === normalizedUrl)

        let fuenteId: string

        if (existingFuente) {
            fuenteId = existingFuente.id
            console.log(`[Fuentes] Fuente existente encontrada: ${existingFuente.nombre_fuente} (${fuenteId})`)
        } else {
            // Crear nueva fuente con URL normalizada
            const { data: newFuente, error: createError } = await supabaseAdmin
                .from('fuentes_final')
                .insert({
                    nombre_fuente: nombre_fuente.trim(),
                    url: normalizedUrl,  // ✅ Guardar URL normalizada
                    rss_url: rss_url?.trim() || null,
                    region: region.trim(),
                    esta_activo: true
                })
                .select('id')
                .single()

            if (createError) {
                console.error('Error creando fuente:', createError)
                return NextResponse.json(
                    { error: 'Error creando fuente', details: createError.message },
                    { status: 500 }
                )
            }

            fuenteId = newFuente.id
            console.log(`[Fuentes] Nueva fuente creada: ${fuenteId}`)
        }

        // 2. Verificar si ya tiene suscripción
        const { data: existingSub } = await supabaseAdmin
            .from('user_fuentes_suscripciones')
            .select('id')
            .eq('user_id', ownerId)
            .eq('fuente_id', fuenteId)
            .single()

        if (existingSub) {
            return NextResponse.json(
                { error: 'Ya estás suscrito a esta fuente' },
                { status: 409 }
            )
        }

        // 3. Crear suscripción
        const { data: suscripcion, error: subError } = await supabaseAdmin
            .from('user_fuentes_suscripciones')
            .insert({
                user_id: ownerId,
                fuente_id: fuenteId,
                categoria: categoria?.trim() || 'general',
                esta_activo: true
            })
            .select()
            .single()

        if (subError) {
            console.error('Error creando suscripción:', subError)
            return NextResponse.json(
                { error: 'Error creando suscripción' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: existingFuente ? 'Suscrito a fuente existente' : 'Fuente creada y suscrita',
            data: { fuente_id: fuenteId, suscripcion_id: suscripcion.id }
        }, { status: 201 })

    } catch (error) {
        console.error('Error en POST /api/fuentes:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        if (!canModifyResources(user)) {
            return NextResponse.json(
                { error: 'No tienes permisos para eliminar fuentes' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const suscripcionId = searchParams.get('id')
        const fuenteId = searchParams.get('fuente_id')

        if (!suscripcionId && !fuenteId) {
            return NextResponse.json(
                { error: 'Se requiere id o fuente_id' },
                { status: 400 }
            )
        }

        const ownerId = getResourceOwnerId(user)

        // Eliminar suscripción (no la fuente)
        let deleteQuery = supabaseAdmin
            .from('user_fuentes_suscripciones')
            .delete()
            .eq('user_id', ownerId)

        if (suscripcionId) {
            deleteQuery = deleteQuery.eq('id', suscripcionId)
        } else if (fuenteId) {
            deleteQuery = deleteQuery.eq('fuente_id', fuenteId)
        }

        const { error } = await deleteQuery

        if (error) {
            console.error('Error eliminando suscripción:', error)
            return NextResponse.json(
                { error: 'Error eliminando suscripción' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Suscripción eliminada'
        })

    } catch (error) {
        console.error('Error en DELETE /api/fuentes:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
