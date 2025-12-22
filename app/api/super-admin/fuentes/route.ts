import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase-auth'
import { supabaseAdmin } from '@/lib/supabase-server'

// GET: Obtener todas las fuentes
export async function GET() {
    const user = await getCurrentUser()
    if (!user || user.role !== 'super_admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
        .from('fuentes_final')
        .select('*')
        .order('region')
        .order('nombre_fuente')

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}

// POST: Crear nueva fuente
export async function POST(request: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'super_admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { region, nombre_fuente, url, rss_url, tipo_scraping, selectores_css } = body

    if (!region || !nombre_fuente || !url) {
        return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // ✅ NUEVO: Normalizar URL para evitar duplicados
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

            // Reconstruir URL normalizada (sin www opcional)
            return `${urlObj.protocol}//${urlObj.hostname}${path}`.toLowerCase()
        } catch {
            // Si falla el parsing, al menos quitar trailing slash
            return inputUrl.trim().replace(/\/+$/, '').toLowerCase()
        }
    }

    const normalizedUrl = normalizeUrl(url)
    const normalizedRssUrl = rss_url ? normalizeUrl(rss_url) : null

    // ✅ NUEVO: Verificar si ya existe una fuente con URL similar
    const { data: existing } = await supabaseAdmin
        .from('fuentes_final')
        .select('id, url, nombre_fuente')
        .or(`url.ilike.%${new URL(normalizedUrl).hostname}%`)

    // Verificar si alguna URL existente coincide después de normalizar
    const duplicate = existing?.find(f => normalizeUrl(f.url) === normalizedUrl)
    if (duplicate) {
        return NextResponse.json({
            error: `Ya existe una fuente con esta URL: "${duplicate.nombre_fuente}"`,
            existingSource: duplicate
        }, { status: 409 }) // Conflict
    }

    const { data, error } = await supabaseAdmin
        .from('fuentes_final')
        .insert({
            region,
            nombre_fuente,
            url: normalizedUrl,  // ✅ Guardar URL normalizada
            rss_url: normalizedRssUrl,
            tipo_scraping: tipo_scraping || 'web',
            selectores_css: selectores_css || {},
            esta_activo: true
        })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}

// PUT: Actualizar fuente existente
export async function PUT(request: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'super_admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
        return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
        .from('fuentes_final')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}

// DELETE: Eliminar fuente
export async function DELETE(request: NextRequest) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'super_admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
        .from('fuentes_final')
        .delete()
        .eq('id', id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
