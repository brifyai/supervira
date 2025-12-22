/**
 * Cliente Supabase para SERVER ONLY
 * Solo importar en API routes, Server Components, middleware
 */
import 'server-only';

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * 🖥️ Cliente SERVER - Para API routes y Server Components
 * Respeta RLS y mantiene sesión del usuario
 */
export async function createSupabaseServer() {
    const cookieStore = await cookies()
    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (cookiesToSet) => {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                } catch {
                    // Ignorar errores en Server Components (solo lectura)
                }
            }
        }
    })
}

/**
 * 🖥️ Cliente SERVER READONLY - Para operaciones largas
 * NO intenta refrescar tokens, evitando el error "Already Used"
 */
export async function createSupabaseServerReadOnly() {
    const cookieStore = await cookies()
    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll: () => cookieStore.getAll(),
            // No setear cookies = no refresh de tokens
            setAll: () => { }
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}

/**
 * 🔴 Cliente ADMIN - Bypassa RLS, SOLO para backend
 * NUNCA importar en componentes del cliente
 */
export const supabaseAdmin = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
)

/**
 * 🔐 Obtener sesión del usuario para API Routes
 * Retorna un objeto compatible con el formato de NextAuth para facilitar migración
 * ✅ MEJORA: Usa cliente read-only para evitar "Already Used" en operaciones largas
 */
export async function getSupabaseSession() {

    // ✅ Usar cliente read-only para no refrescar tokens durante operaciones largas
    const supabase = await createSupabaseServerReadOnly()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return null
    }

    // Intentar obtener datos adicionales de la tabla users
    // Nota: La tabla users usa su propio UUID, no el de Supabase Auth
    // Por eso buscamos por email (unique)
    // Solo columnas que existen: id, email, role, nombre_completo
    const { data: userData, error: dbError } = await supabaseAdmin
        .from('users')
        .select('id, email, role, nombre_completo')
        .eq('email', user.email)
        .single()



    // Retornar formato compatible con NextAuth session
    return {
        user: {
            id: user.id,
            email: user.email,
            name: userData?.nombre_completo || user.user_metadata?.full_name || user.email,
            role: userData?.role || user.user_metadata?.role || 'user'
        }
    }
}
