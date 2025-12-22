// ==================================================
// VIRA - Componente de Ruta Protegida
// ==================================================

'use client'

import { useSupabaseUser } from '@/hooks/use-supabase-user'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { UserRole, hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/permissions'
import { createSuccessResponse } from '@/lib/auth-middleware'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: UserRole
  requiredPermission?: string
  requiredAnyPermissions?: string[]
  requiredAllPermissions?: string[]
  fallback?: ReactNode
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  requiredAnyPermissions,
  requiredAllPermissions,
  fallback,
  redirectTo = '/auth/signin'
}: ProtectedRouteProps) {
  const { session, isLoading } = useSupabaseUser()
  const status = isLoading ? 'loading' : (session ? 'authenticated' : 'unauthenticated')
  const router = useRouter()

  useEffect(() => {
    // Si está cargando, no hacer nada
    if (status === 'loading') return

    // Si no hay sesión, redirigir al login
    if (!session) {
      router.push(redirectTo)
      return
    }

    // Obtener el rol del usuario
    const userRole = session.user?.role as UserRole

    // Verificar rol requerido
    if (requiredRole && userRole !== requiredRole) {
      router.push('/unauthorized')
      return
    }

    // Verificar permiso específico
    if (requiredPermission && !hasPermission(userRole, requiredPermission)) {
      router.push('/unauthorized')
      return
    }

    // Verificar cualquiera de los permisos requeridos
    if (requiredAnyPermissions && !hasAnyPermission(userRole, requiredAnyPermissions)) {
      router.push('/unauthorized')
      return
    }

    // Verificar todos los permisos requeridos
    if (requiredAllPermissions && !hasAllPermissions(userRole, requiredAllPermissions)) {
      router.push('/unauthorized')
      return
    }
  }, [session, status, router, requiredRole, requiredPermission, requiredAnyPermissions, requiredAllPermissions, redirectTo])

  // Si está cargando, mostrar loading
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Si no hay sesión, mostrar fallback o nada
  if (!session) {
    return <>{fallback || null}</>
  }

  // Obtener el rol del usuario
  const userRole = session.user?.role as UserRole

  // Verificar permisos
  const hasRequiredRole = !requiredRole || userRole === requiredRole
  const hasRequiredPermission = !requiredPermission || hasPermission(userRole, requiredPermission)
  const hasAnyRequiredPermissions = !requiredAnyPermissions || hasAnyPermission(userRole, requiredAnyPermissions)
  const hasAllRequiredPermissions = !requiredAllPermissions || hasAllPermissions(userRole, requiredAllPermissions)

  // Si no tiene los permisos requeridos, mostrar fallback
  if (!hasRequiredRole || !hasRequiredPermission || !hasAnyRequiredPermissions || !hasAllRequiredPermissions) {
    return <>{fallback || null}</>
  }

  // Si tiene todos los permisos requeridos, mostrar los hijos
  return <>{children}</>
}

/**
 * Componente para mostrar contenido condicional basado en permisos
 */
export function PermissionGate({
  children,
  requiredRole,
  requiredPermission,
  requiredAnyPermissions,
  requiredAllPermissions,
  fallback = null
}: Omit<ProtectedRouteProps, 'redirectTo'>) {
  const { session, isLoading } = useSupabaseUser()
  const status = isLoading ? 'loading' : (session ? 'authenticated' : 'unauthenticated')

  // Si está cargando, no mostrar nada
  if (status === 'loading') {
    return null
  }

  // Si no hay sesión, mostrar fallback
  if (!session) {
    return <>{fallback}</>
  }

  // Obtener el rol del usuario
  const userRole = session.user?.role as UserRole

  // Verificar permisos
  const hasRequiredRole = !requiredRole || userRole === requiredRole
  const hasRequiredPermission = !requiredPermission || hasPermission(userRole, requiredPermission)
  const hasAnyRequiredPermissions = !requiredAnyPermissions || hasAnyPermission(userRole, requiredAnyPermissions)
  const hasAllRequiredPermissions = !requiredAllPermissions || hasAllPermissions(userRole, requiredAllPermissions)

  // Si no tiene los permisos requeridos, mostrar fallback
  if (!hasRequiredRole || !hasRequiredPermission || !hasAnyRequiredPermissions || !hasAllRequiredPermissions) {
    return <>{fallback}</>
  }

  // Si tiene todos los permisos requeridos, mostrar los hijos
  return <>{children}</>
}

/**
 * Hook personalizado para verificar permisos en componentes
 */
export function usePermissions() {
  const { session, isLoading } = useSupabaseUser()
  const status = isLoading ? 'loading' : (session ? 'authenticated' : 'unauthenticated')

  const userRole = session?.user?.role as UserRole

  const checkPermission = (permission: string) => {
    if (status === 'loading' || !session) return false
    return hasPermission(userRole, permission)
  }

  const checkAnyPermission = (permissions: string[]) => {
    if (status === 'loading' || !session) return false
    return hasAnyPermission(userRole, permissions)
  }

  const checkAllPermissions = (permissions: string[]) => {
    if (status === 'loading' || !session) return false
    return hasAllPermissions(userRole, permissions)
  }

  const checkRole = (role: UserRole) => {
    if (status === 'loading' || !session) return false
    return userRole === role
  }

  const isAdmin = userRole === 'admin'
  const isSuperAdmin = userRole === 'super_admin'
  const isUser = userRole === 'user'

  return {
    userRole,
    isAdmin,
    isSuperAdmin,
    isUser,
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    checkRole,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated'
  }
}

/**
 * Componente para mostrar contenido solo para administradores
 */
export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate
      requiredRole="admin"
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

/**
 * Componente para mostrar contenido solo para operadores y administradores
 */
export function StaffOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate
      requiredAnyPermissions={['system:read', 'news:read']}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

/**
 * Componente para mostrar contenido basado en permisos específicos
 */
export function Can({
  permission,
  permissions,
  role,
  children,
  fallback = null
}: {
  permission?: string
  permissions?: string[]
  role?: UserRole
  children: ReactNode
  fallback?: ReactNode
}) {
  return (
    <PermissionGate
      requiredPermission={permission}
      requiredAnyPermissions={permissions}
      requiredRole={role}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

/**
 * Componente para mostrar contenido cuando NO se tienen los permisos
 */
export function Cannot({
  permission,
  permissions,
  role,
  children,
  fallback = null
}: {
  permission?: string
  permissions?: string[]
  role?: UserRole
  children: ReactNode
  fallback?: ReactNode
}) {
  const { checkPermission, checkAnyPermission, checkRole } = usePermissions()

  let hasAccess = true

  if (role) {
    hasAccess = checkRole(role)
  } else if (permission) {
    hasAccess = checkPermission(permission)
  } else if (permissions) {
    hasAccess = checkAnyPermission(permissions)
  }

  // Invertir la lógica: mostrar children si NO tiene acceso
  if (!hasAccess) {
    return <>{children}</>
  }

  return <>{fallback}</>
}