'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  FileText,
  Layout,
  Zap,
  FolderOpen,
  Settings,
  Radio,
  AlertCircle,
  User,
  Users,
  LogOut,
  Menu,
  Clock,
  Mail,
  Crown,
  Shield,
  Badge
} from 'lucide-react'
import { useSupabaseUser } from '@/hooks/use-supabase-user'

// Items de navegación por rol (super_admin, admin, user)
const allNavigationItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: BarChart3,
    roles: ['super_admin', 'admin', 'user'],
  },
  {
    name: 'Crear Noticiero',
    href: '/crear-noticiero',
    icon: FileText,
    roles: ['super_admin', 'admin', 'user'],
  },
  {
    name: 'Último Minuto',
    href: '/ultimo-minuto',
    icon: AlertCircle,
    roles: ['super_admin', 'admin', 'user'],
  },
  {
    name: 'Timeline Noticiero',
    href: '/timeline-noticiero',
    icon: Clock,
    roles: ['super_admin', 'admin', 'user'],
  },
  {
    name: 'Plantillas',
    href: '/plantillas',
    icon: Layout,
    roles: ['super_admin', 'admin'],  // Solo admins
  },
  {
    name: 'Automatización',
    href: '/automatizacion',
    icon: Zap,
    roles: ['super_admin', 'admin', 'user'],
  },
  {
    name: 'Activos',
    href: '/activos',
    icon: FolderOpen,
    roles: ['super_admin', 'admin', 'user'],
  },
  // Bibliotecas oculta temporalmente
  // {
  //   name: 'Bibliotecas',
  //   href: '/bibliotecas',
  //   icon: BookOpen,
  //   roles: ['super_admin', 'admin', 'user'],
  // },
  {
    name: 'Mis Usuarios',
    href: '/admin/usuarios',
    icon: Users,
    roles: ['admin'],  // Solo ADMIN (no super_admin ni user)
  },
  {
    name: 'Integraciones',
    href: '/integraciones',
    icon: Settings,
    roles: ['super_admin', 'admin'],
  },
  {
    name: 'Configuración Sistema',
    href: '/super-admin/config',
    icon: Crown,
    roles: ['super_admin'],  // Solo SUPER_ADMIN
  },

  {
    name: 'Gestión Fuentes',
    href: '/super-admin/fuentes',
    icon: Settings,
    roles: ['super_admin'],  // Solo SUPER_ADMIN - Configurar selectores CSS y RSS
  },
]

export function Navigation() {
  const pathname = usePathname()
  const { user, userData, signOut, isLoading } = useSupabaseUser()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Usar el rol desde la base de datos (userData)
  const userRole = (userData?.role || 'user') as 'super_admin' | 'admin' | 'user'
  const navigationItems = allNavigationItems.filter(item =>
    item.roles.includes(userRole)
  )

  const handleSignOut = async () => {
    await signOut()
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-sm">
            <Crown className="h-3 w-3 mr-1" />
            Super Admin
          </span>
        )
      case 'admin':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-sm">
            <User className="h-3 w-3 mr-1" />
            Usuario
          </span>
        )
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
              <Radio className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">VIRA</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center flex-1 mx-6">
            <div className="flex items-center gap-1 flex-wrap justify-center w-full">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {userData?.nombre_completo ?? user?.email ?? 'Usuario'}
                  </p>
                  {getRoleBadge(userRole)}
                </div>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <Mail className="h-3 w-3 mr-1" />
                  <span>{user?.email || 'usuario@vira.cl'}</span>
                </div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {userData?.nombre_completo ?? user?.email ?? 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.email ?? 'usuario@vira.cl'}
                    </p>
                    <div className="mt-1">
                      {getRoleBadge(userRole)}
                    </div>
                  </div>

                  <Link
                    href="/perfil"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <User className="h-4 w-4 mr-3" />
                    Mi Perfil
                  </Link>

                  {/* Facturación oculta temporalmente */}
                  {/* {(userRole === 'admin' || userRole === 'super_admin') && (
                    <Link
                      href="/pagos"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <CreditCard className="h-4 w-4 mr-3" />
                      Facturación
                    </Link>
                  )} */}

                  <div className="border-t border-gray-100">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        handleSignOut()
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
