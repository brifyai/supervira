import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/supabase-auth'
import { getResourceOwnerId, canModifyResources } from '@/lib/resource-owner'

// Cliente Supabase con Service Role para operaciones seguras
const supabase = supabaseAdmin

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Obtener el owner correcto (admin_id para sub-usuarios)
        const ownerId = getResourceOwnerId(user)

        const { data: campaigns, error } = await supabase
            .from('campanas_publicitarias')
            .select('*')
            .eq('user_id', ownerId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching campaigns:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(campaigns)
    } catch (error: any) {
        console.error('Error in GET /api/campaigns:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Solo admin puede crear campañas
        if (!canModifyResources(user)) {
            return NextResponse.json({
                error: 'No tienes permisos para crear campañas'
            }, { status: 403 })
        }

        const body = await request.json()
        const {
            nombre,
            descripcion,
            url_audio,
            s3_key,
            duracion_segundos,
            fecha_inicio,
            fecha_fin
        } = body

        if (!nombre) {
            return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
        }

        const ownerId = getResourceOwnerId(user)

        const { data, error } = await supabase
            .from('campanas_publicitarias')
            .insert({
                nombre,
                descripcion,
                url_audio,
                s3_key,
                duracion_segundos,
                fecha_inicio,
                fecha_fin,
                user_id: ownerId,
                esta_activo: true
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating campaign:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error in POST /api/campaigns:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
