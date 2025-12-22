/**
 * API: /api/radios
 * Gestión de radios con filtrado automático por usuario
 * 
 * GET: Retorna las radios del usuario actual (o su admin si es sub-usuario)
 * POST: Crea una radio asignada al usuario actual
 * DELETE: Elimina una radio (solo admin/super_admin)
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
        const activo = searchParams.get('activo')

        // Determinar qué radios mostrar según el rol
        let query = supabaseAdmin
            .from('radios')
            .select('*')
            .order('nombre', { ascending: true })

        // Filtrar por owner según el rol
        // Todos los usuarios ven solo las radios de su "owner":
        // - super_admin y admin: ven las suyas (user_id = su ID)
        // - user: ve las de su admin (user_id = admin_id)
        const ownerId = getResourceOwnerId(user)
        query = query.eq('user_id', ownerId)

        // Filtrar por región si se especifica
        if (region) {
            query = query.eq('region', region)
        }

        // Filtrar por estado activo si se especifica
        if (activo !== null) {
            query = query.eq('esta_activo', activo === 'true')
        }

        const { data: radios, error } = await query

        if (error) {
            console.error('Error obteniendo radios:', error)
            return NextResponse.json(
                { error: 'Error obteniendo radios', details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: radios || [],  // Mantener 'data' para compatibilidad
            radios: radios || [],
            count: radios?.length || 0
        })

    } catch (error) {
        console.error('Error en GET /api/radios:', error)
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

        // Solo admin y super_admin pueden crear radios
        if (!canModifyResources(user)) {
            return NextResponse.json(
                { error: 'No tienes permisos para crear radios' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { nombre, frecuencia, region, url } = body

        if (!nombre || !frecuencia || !region) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos: nombre, frecuencia, region' },
                { status: 400 }
            )
        }

        // Asignar al owner actual
        const ownerId = getResourceOwnerId(user)

        const { data: radio, error } = await supabaseAdmin
            .from('radios')
            .insert({
                nombre: nombre.trim(),
                frecuencia: frecuencia.trim(),
                region: region.trim(),
                url: url?.trim() || null,
                user_id: ownerId,
                esta_activo: true
            })
            .select()
            .single()

        if (error) {
            console.error('Error creando radio:', error)
            return NextResponse.json(
                { error: 'Error creando radio', details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: radio,  // Mantener 'data' para compatibilidad
            radio
        }, { status: 201 })

    } catch (error) {
        console.error('Error en POST /api/radios:', error)
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

        // Solo admin y super_admin pueden eliminar radios
        if (!canModifyResources(user)) {
            return NextResponse.json(
                { error: 'No tienes permisos para eliminar radios' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const radioId = searchParams.get('id')

        if (!radioId) {
            return NextResponse.json(
                { error: 'ID de radio requerido' },
                { status: 400 }
            )
        }

        // Verificar que la radio pertenece al usuario (excepto super_admin)
        if (user.role !== 'super_admin') {
            const ownerId = getResourceOwnerId(user)
            const { data: existing } = await supabaseAdmin
                .from('radios')
                .select('user_id')
                .eq('id', radioId)
                .single()

            if (existing?.user_id !== ownerId) {
                return NextResponse.json(
                    { error: 'No tienes permisos para eliminar esta radio' },
                    { status: 403 }
                )
            }
        }

        const { error } = await supabaseAdmin
            .from('radios')
            .delete()
            .eq('id', radioId)

        if (error) {
            console.error('Error eliminando radio:', error)
            return NextResponse.json(
                { error: 'Error eliminando radio' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Radio eliminada exitosamente'
        })

    } catch (error) {
        console.error('Error en DELETE /api/radios:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
