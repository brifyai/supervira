// ==================================================
// VIRA - Middleware de Autenticación y Permisos
// ==================================================

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer, supabaseAdmin } from './supabase-server'
import { UserRole, hasPermission, hasAnyPermission, hasAllPermissions } from './permissions'

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
  admin_id?: string  // ID del admin padre (para usuarios dependientes)
  name?: string
  company?: string
}

export interface AuthResult {
  success: boolean
  user?: AuthenticatedUser
  error?: string
  status?: number
}

/**
 * Verifica la autenticación del usuario usando Supabase Auth
 */
export async function authenticate(request: NextRequest): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'No autenticado',
        status: 401
      }
    }

    // Obtener información adicional del usuario desde la base de datos
    // Nota: Buscamos por email porque el ID de Supabase Auth puede diferir del ID en la tabla users
    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role, nombre_completo, company, admin_id')
      .eq('email', user.email)
      .single()

    if (error || !userData) {
      console.error('[authenticate] Usuario no encontrado en tabla users:', user.email, error?.message)
      return {
        success: false,
        error: 'Usuario no encontrado',
        status: 404
      }
    }

    return {
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role as UserRole,
        admin_id: userData.admin_id || undefined,
        name: userData.nombre_completo || undefined,
        company: userData.company || undefined
      }
    }
  } catch (error) {
    console.error('Error en autenticación:', error)
    return {
      success: false,
      error: 'Error de autenticación',
      status: 500
    }
  }
}


/**
 * Verifica si el usuario tiene un permiso específico
 */
export async function requirePermission(
  request: NextRequest,
  permission: string
): Promise<AuthResult> {
  const authResult = await authenticate(request)

  if (!authResult.success) {
    return authResult
  }

  if (!hasPermission(authResult.user!.role, permission)) {
    return {
      success: false,
      error: 'Permiso denegado',
      status: 403
    }
  }

  return authResult
}

/**
 * Verifica si el usuario tiene alguno de los permisos especificados
 */
export async function requireAnyPermission(
  request: NextRequest,
  permissions: string[]
): Promise<AuthResult> {
  const authResult = await authenticate(request)

  if (!authResult.success) {
    return authResult
  }

  if (!hasAnyPermission(authResult.user!.role, permissions)) {
    return {
      success: false,
      error: 'Permiso denegado',
      status: 403
    }
  }

  return authResult
}

/**
 * Verifica si el usuario tiene todos los permisos especificados
 */
export async function requireAllPermissions(
  request: NextRequest,
  permissions: string[]
): Promise<AuthResult> {
  const authResult = await authenticate(request)

  if (!authResult.success) {
    return authResult
  }

  if (!hasAllPermissions(authResult.user!.role, permissions)) {
    return {
      success: false,
      error: 'Permiso denegado',
      status: 403
    }
  }

  return authResult
}

/**
 * Verifica si el usuario tiene un rol específico
 */
export async function requireRole(
  request: NextRequest,
  requiredRole: UserRole
): Promise<AuthResult> {
  const authResult = await authenticate(request)

  if (!authResult.success) {
    return authResult
  }

  if (authResult.user!.role !== requiredRole) {
    return {
      success: false,
      error: 'Rol insuficiente',
      status: 403
    }
  }

  return authResult
}

/**
 * Verifica si el usuario tiene alguno de los roles especificados
 */
export async function requireAnyRole(
  request: NextRequest,
  requiredRoles: UserRole[]
): Promise<AuthResult> {
  const authResult = await authenticate(request)

  if (!authResult.success) {
    return authResult
  }

  if (!requiredRoles.includes(authResult.user!.role)) {
    return {
      success: false,
      error: 'Rol insuficiente',
      status: 403
    }
  }

  return authResult
}

/**
 * Crea una respuesta de error estandarizada
 */
export function createErrorResponse(error: string, status: number = 403): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

/**
 * Crea una respuesta de éxito estandarizada
 */
export function createSuccessResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString()
    },
    { status }
  )
}

/**
 * Wrapper para APIs que requieren autenticación
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await authenticate(request)

    if (!authResult.success) {
      return createErrorResponse(authResult.error!, authResult.status)
    }

    try {
      return await handler(request, authResult.user!, ...args)
    } catch (error) {
      console.error('Error en handler autenticado:', error)
      return createErrorResponse('Error interno del servidor', 500)
    }
  }
}

/**
 * Wrapper para APIs que requieren un permiso específico
 */
export function withPermission<T extends any[]>(
  permission: string,
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requirePermission(request, permission)

    if (!authResult.success) {
      return createErrorResponse(authResult.error!, authResult.status)
    }

    try {
      return await handler(request, authResult.user!, ...args)
    } catch (error) {
      console.error('Error en handler con permisos:', error)
      return createErrorResponse('Error interno del servidor', 500)
    }
  }
}

/**
 * Wrapper para APIs que requieren cualquiera de varios permisos
 */
export function withAnyPermission<T extends any[]>(
  permissions: string[],
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requireAnyPermission(request, permissions)

    if (!authResult.success) {
      return createErrorResponse(authResult.error!, authResult.status)
    }

    try {
      return await handler(request, authResult.user!, ...args)
    } catch (error) {
      console.error('Error en handler con permisos múltiples:', error)
      return createErrorResponse('Error interno del servidor', 500)
    }
  }
}

/**
 * Wrapper para APIs que requieren un rol específico
 */
export function withRole<T extends any[]>(
  requiredRole: UserRole,
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await requireRole(request, requiredRole)

    if (!authResult.success) {
      return createErrorResponse(authResult.error!, authResult.status)
    }

    try {
      return await handler(request, authResult.user!, ...args)
    } catch (error) {
      console.error('Error en handler con rol:', error)
      return createErrorResponse('Error interno del servidor', 500)
    }
  }
}

/**
 * Verifica si un usuario puede acceder a recursos de otro usuario
 */
export function canAccessUserResource(
  currentUser: AuthenticatedUser,
  targetUserId: string,
  permission: string = 'users:read'
): boolean {
  // Super Admin puede acceder a todo
  if (currentUser.role === 'super_admin') {
    return true
  }

  // Admin puede acceder a todo lo suyo y de sus sub-usuarios
  if (currentUser.role === 'admin') {
    return hasPermission(currentUser.role, permission)
  }

  // Usuarios solo pueden acceder a sus propios recursos
  if (currentUser.id === targetUserId) {
    return true
  }

  // User puede acceder a recursos de su admin
  if (currentUser.role === 'user' && currentUser.admin_id === targetUserId) {
    return true
  }

  return false
}

/**
 * Filtra datos según los permisos del usuario
 */
export function filterDataByPermissions<T extends { user_id?: string }>(
  data: T[],
  user: AuthenticatedUser,
  permission: string = 'users:read'
): T[] {
  if (hasPermission(user.role, permission)) {
    return data
  }

  // Si no tiene permiso, solo mostrar sus propios datos
  return data.filter(item => item.user_id === user.id)
}

/**
 * Obtiene el WHERE clause para consultas a base de datos según permisos
 */
export function getPermissionFilter(
  user: AuthenticatedUser,
  permission: string = 'users:read',
  userIdColumn: string = 'user_id'
): string {
  if (hasPermission(user.role, permission)) {
    return '1=1' // Sin filtro
  }

  return `${userIdColumn} = '${user.id}'`
}