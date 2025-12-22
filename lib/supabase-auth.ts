/**
 * VIRA - Helpers de Autenticación con Supabase
 * Centraliza funciones para obtener usuario y sesión
 */

import { createSupabaseServer, supabaseAdmin } from './supabase-server'

export interface AppUser {
    id: string
    email: string
    role: 'super_admin' | 'admin' | 'user'
    admin_id?: string  // ID del admin padre (para usuarios dependientes)
    nombre_completo?: string
    company?: string
    plan?: string
}

/**
 * Obtiene el usuario autenticado actual (Server-side)
 * Retorna null si no está autenticado
 */
export async function getCurrentUser(): Promise<AppUser | null> {
    try {
        const supabase = await createSupabaseServer()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            console.log('[getCurrentUser] No auth user found')
            return null
        }

        console.log(`[getCurrentUser] Auth user: ${user.email}, ID: ${user.id}`)

        // Intentar obtener por ID primero
        let { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, email, role, nombre_completo, admin_id, is_active')
            .eq('id', user.id)
            .single()

        // Si no encuentra por ID, buscar por email
        if (!userData && user.email) {
            console.log(`[getCurrentUser] User not found by ID, trying email: ${user.email}`)
            const { data: userByEmail, error: emailError } = await supabaseAdmin
                .from('users')
                .select('id, email, role, nombre_completo, admin_id, is_active')
                .eq('email', user.email)
                .single()

            if (emailError) {
                console.error(`[getCurrentUser] Email lookup error:`, emailError.message, emailError.code)
            }

            if (userByEmail) {
                console.log(`[getCurrentUser] Found user by email: ${userByEmail.email}, role: ${userByEmail.role}`)
                userData = userByEmail
            } else {
                console.log(`[getCurrentUser] User NOT found by email either!`)
            }
        }

        if (!userData) {
            console.log(`[getCurrentUser] Creating new user record for ${user.email}`)
            // Si no existe en la tabla users, crear registro básico
            const { data: newUser } = await supabaseAdmin
                .from('users')
                .insert({
                    id: user.id,
                    email: user.email,
                    role: 'user',
                    nombre_completo: user.user_metadata?.full_name || user.email?.split('@')[0]
                })
                .select()
                .single()

            return newUser as AppUser | null
        }

        console.log(`[getCurrentUser] Returning user: ${userData.email}, role: ${userData.role}`)
        return userData as AppUser
    } catch (error) {
        console.error('Error getting current user:', error)
        return null
    }
}

/**
 * Verifica si el usuario actual tiene un rol específico o superior
 */
export async function hasRole(requiredRole: 'super_admin' | 'admin' | 'user'): Promise<boolean> {
    const user = await getCurrentUser()
    if (!user) return false

    // Super admin tiene acceso a todo
    if (user.role === 'super_admin') return true

    // Admin tiene acceso a admin y user
    if (requiredRole === 'admin') {
        return user.role === 'admin'
    }

    // User role - todos los autenticados
    return true
}

/**
 * Obtiene el ID del usuario actual o null
 */
export async function getCurrentUserId(): Promise<string | null> {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
}

/**
 * Obtiene el ID del owner de recursos para el usuario actual
 * Para users dependientes, retorna el admin_id
 */
export async function getResourceOwnerIdForCurrentUser(): Promise<string | null> {
    const user = await getCurrentUser()
    if (!user) return null

    // Si es user con admin_id, retornar el admin_id
    if (user.role === 'user' && user.admin_id) {
        return user.admin_id
    }

    return user.id
}
