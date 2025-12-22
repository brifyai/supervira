/**
 * VIRA - Resource Owner Utilities
 * Funciones para determinar el propietario de recursos en sistema multi-tenant
 */

import { AppUser } from './supabase-auth'

/**
 * Obtiene el ID del propietario de recursos para un usuario
 * - super_admin: retorna su propio ID (ve todo)
 * - admin: retorna su propio ID
 * - user: retorna el admin_id (recursos compartidos con su admin)
 */
export function getResourceOwnerId(user: AppUser): string {
    // Si es un sub-usuario (role=user con admin_id), usar el ID del admin
    if (user.role === 'user' && user.admin_id) {
        return user.admin_id
    }
    // Para admin y super_admin, usar su propio ID
    return user.id
}

/**
 * Verifica si el usuario puede modificar recursos (crear, editar, eliminar)
 * Solo admin y super_admin pueden modificar
 */
export function canModifyResources(user: AppUser): boolean {
    return user.role === 'admin' || user.role === 'super_admin'
}

/**
 * Verifica si el usuario puede ver recursos de un owner específico
 */
export function canAccessResource(user: AppUser, resourceOwnerId: string): boolean {
    // Super admin puede ver todo
    if (user.role === 'super_admin') return true

    // Verificar que el recurso pertenece al mismo owner
    const ownerId = getResourceOwnerId(user)
    return ownerId === resourceOwnerId
}

/**
 * Construye el filtro de owner para queries de Supabase
 */
export function getOwnerFilter(user: AppUser): { user_id: string } | null {
    // Super admin no tiene filtro (ve todo)
    if (user.role === 'super_admin') return null

    return { user_id: getResourceOwnerId(user) }
}
