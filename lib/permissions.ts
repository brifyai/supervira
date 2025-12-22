// ==================================================
// VIRA - Sistema de Permisos Granular
// ==================================================

export type UserRole = 'super_admin' | 'admin' | 'user'

export interface Permission {
  code: string
  name: string
  description: string
  category: 'users' | 'system' | 'news' | 'templates' | 'automation' | 'library' | 'billing' | 'reports' | 'integrations' | 'metrics' | 'profile'
}

export interface RolePermissions {
  role: UserRole
  permissions: Permission[]
}

// Definición completa de permisos
export const PERMISSIONS: Permission[] = [
  // Permisos de Usuarios
  {
    code: 'users:read',
    name: 'Ver Usuarios',
    description: 'Puede ver la lista de usuarios del sistema',
    category: 'users'
  },
  {
    code: 'users:write',
    name: 'Gestionar Usuarios',
    description: 'Puede crear, editar y eliminar usuarios',
    category: 'users'
  },
  {
    code: 'users:delete',
    name: 'Eliminar Usuarios',
    description: 'Puede eliminar usuarios permanentemente',
    category: 'users'
  },

  // Permisos del Sistema
  {
    code: 'system:read',
    name: 'Ver Configuración',
    description: 'Puede ver la configuración del sistema',
    category: 'system'
  },
  {
    code: 'system:write',
    name: 'Modificar Sistema',
    description: 'Puede modificar configuraciones del sistema',
    category: 'system'
  },
  {
    code: 'system:config',
    name: 'Configurar Sistema',
    description: 'Puede configurar parámetros globales',
    category: 'system'
  },

  // Permisos de Noticias
  {
    code: 'news:read',
    name: 'Ver Noticias',
    description: 'Puede ver todas las noticias del sistema',
    category: 'news'
  },
  {
    code: 'news:write',
    name: 'Gestionar Noticias',
    description: 'Puede crear y editar cualquier noticia',
    category: 'news'
  },
  {
    code: 'news:publish',
    name: 'Publicar Noticias',
    description: 'Puede publicar noticias',
    category: 'news'
  },
  {
    code: 'news:read_own',
    name: 'Ver Noticias Propias',
    description: 'Puede ver solo sus propias noticias',
    category: 'news'
  },
  {
    code: 'news:write_own',
    name: 'Gestionar Noticias Propias',
    description: 'Puede crear y editar solo sus noticias',
    category: 'news'
  },

  // Permisos de Plantillas
  {
    code: 'templates:read',
    name: 'Ver Plantillas',
    description: 'Puede ver todas las plantillas del sistema',
    category: 'templates'
  },
  {
    code: 'templates:write',
    name: 'Gestionar Plantillas',
    description: 'Puede crear y editar cualquier plantilla',
    category: 'templates'
  },
  {
    code: 'templates:global',
    name: 'Gestionar Plantillas Globales',
    description: 'Puede crear y editar plantillas globales',
    category: 'templates'
  },
  {
    code: 'templates:read_own',
    name: 'Ver Plantillas Propias',
    description: 'Puede ver solo sus plantillas',
    category: 'templates'
  },
  {
    code: 'templates:write_own',
    name: 'Gestionar Plantillas Propias',
    description: 'Puede crear y editar solo sus plantillas',
    category: 'templates'
  },

  // Permisos de Automatización
  {
    code: 'automation:manage',
    name: 'Gestionar Automatización',
    description: 'Puede configurar automatizaciones',
    category: 'automation'
  },

  // Permisos de Biblioteca
  {
    code: 'library:manage',
    name: 'Gestionar Biblioteca',
    description: 'Puede gestionar la biblioteca de audio',
    category: 'library'
  },

  // Permisos de Facturación
  {
    code: 'billing:read',
    name: 'Ver Facturación',
    description: 'Puede ver facturación y pagos',
    category: 'billing'
  },
  {
    code: 'billing:write',
    name: 'Gestionar Facturación',
    description: 'Puede gestionar facturación',
    category: 'billing'
  },

  // Permisos de Reportes
  {
    code: 'reports:global',
    name: 'Ver Reportes Globales',
    description: 'Puede ver reportes de todo el sistema',
    category: 'reports'
  },
  {
    code: 'reports:read',
    name: 'Ver Reportes',
    description: 'Puede ver reportes propios',
    category: 'reports'
  },

  // Permisos de Integraciones
  {
    code: 'integrations:manage',
    name: 'Gestionar Integraciones',
    description: 'Puede configurar integraciones del sistema',
    category: 'integrations'
  },

  // Permisos de Métricas
  {
    code: 'metrics:global',
    name: 'Ver Métricas Globales',
    description: 'Puede ver métricas globales del sistema',
    category: 'metrics'
  },

  // Permisos de Perfil
  {
    code: 'profile:manage',
    name: 'Gestionar Perfil',
    description: 'Puede gestionar su propio perfil',
    category: 'profile'
  }
]

// Configuración de permisos por rol
export const ROLE_PERMISSIONS: RolePermissions[] = [
  {
    // SUPER_ADMIN: Acceso total al sistema, configuración global
    role: 'super_admin',
    permissions: PERMISSIONS // Todos los permisos
  },
  {
    // ADMIN: Dueño de cuenta, gestiona sus recursos y sub-usuarios
    role: 'admin',
    permissions: PERMISSIONS.filter(p =>
      !p.code.includes('system:') || p.code === 'system:read' // No config global, pero puede ver
    )
  },
  {
    // USER: Usuario dependiente, solo usa recursos de su admin
    role: 'user',
    permissions: PERMISSIONS.filter(p =>
      p.code.includes('_own') ||
      p.category === 'profile' ||
      p.code === 'news:read_own' ||
      p.code === 'news:write_own' ||
      p.code === 'templates:read_own'
    )
  }
]

// Funciones utilitarias
export const getPermissionsByRole = (role: UserRole): Permission[] => {
  const roleConfig = ROLE_PERMISSIONS.find(rp => rp.role === role)
  return roleConfig?.permissions || []
}

export const hasPermission = (role: UserRole, permissionCode: string): boolean => {
  const permissions = getPermissionsByRole(role)
  return permissions.some(p => p.code === permissionCode)
}

export const hasAnyPermission = (role: UserRole, permissionCodes: string[]): boolean => {
  return permissionCodes.some(code => hasPermission(role, code))
}

export const hasAllPermissions = (role: UserRole, permissionCodes: string[]): boolean => {
  return permissionCodes.every(code => hasPermission(role, code))
}

export const getPermissionsByCategory = (role: UserRole, category: Permission['category']): Permission[] => {
  const permissions = getPermissionsByRole(role)
  return permissions.filter(p => p.category === category)
}

// Verificación de permisos para componentes React
export const usePermissions = (role: UserRole) => {
  return {
    hasPermission: (permissionCode: string) => hasPermission(role, permissionCode),
    hasAnyPermission: (permissionCodes: string[]) => hasAnyPermission(role, permissionCodes),
    hasAllPermissions: (permissionCodes: string[]) => hasAllPermissions(role, permissionCodes),
    getPermissionsByCategory: (category: Permission['category']) => getPermissionsByCategory(role, category),
    permissions: getPermissionsByRole(role)
  }
}

// Middleware helper para APIs
export const checkPermission = (requiredPermission: string) => {
  return (userRole: UserRole): boolean => {
    return hasPermission(userRole, requiredPermission)
  }
}

export const checkAnyPermission = (requiredPermissions: string[]) => {
  return (userRole: UserRole): boolean => {
    return hasAnyPermission(userRole, requiredPermissions)
  }
}

export const checkAllPermissions = (requiredPermissions: string[]) => {
  return (userRole: UserRole): boolean => {
    return hasAllPermissions(userRole, requiredPermissions)
  }
}

// Constantes para facilitar el uso
export const SUPER_ADMIN_PERMISSIONS = getPermissionsByRole('super_admin').map(p => p.code)
export const ADMIN_PERMISSIONS = getPermissionsByRole('admin').map(p => p.code)
export const USER_PERMISSIONS = getPermissionsByRole('user').map(p => p.code)

// Categorías de permisos para UI
export const PERMISSION_CATEGORIES = [
  { value: 'users', label: 'Gestión de Usuarios' },
  { value: 'system', label: 'Sistema' },
  { value: 'news', label: 'Noticias' },
  { value: 'templates', label: 'Plantillas' },
  { value: 'automation', label: 'Automatización' },
  { value: 'library', label: 'Biblioteca' },
  { value: 'billing', label: 'Facturación' },
  { value: 'reports', label: 'Reportes' },
  { value: 'integrations', label: 'Integraciones' },
  { value: 'metrics', label: 'Métricas' },
  { value: 'profile', label: 'Perfil' }
] as const