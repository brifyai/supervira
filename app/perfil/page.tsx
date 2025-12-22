'use client'

export const dynamic = 'force-dynamic'

import { toast } from 'react-toastify'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSupabaseUser } from '@/hooks/use-supabase-user'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Edit, Shield, Building } from 'lucide-react'
import { createSupabaseBrowser } from '@/lib/supabase'

// Tipos de datos basados en la estructura REAL de la BD
interface UserProfile {
  id: string
  email: string
  nombre_completo: string
  role: 'super_admin' | 'admin' | 'user'
  company: string
  is_active: boolean
  created_at: string
  last_login: string
  admin_id?: string
  image?: string
}

export default function PerfilPage() {
  const { session, isLoading: authLoading } = useSupabaseUser()
  const [isLoading, setIsLoading] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // Crear cliente Supabase con soporte SSR
  const supabase = useMemo(() => createSupabaseBrowser(), [])

  // Estado del perfil con campos que EXISTEN en la BD
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: '',
    email: '',
    nombre_completo: '',
    role: 'user',
    company: '',
    is_active: false,
    created_at: '',
    last_login: ''
  })

  // Obtener el email del usuario actual
  const userEmail = session?.user?.email

  // Función para cargar el perfil
  const loadUserProfile = useCallback(async () => {
    if (!userEmail) return

    setIsLoading(true)
    try {
      console.log('[Perfil] Loading profile for:', userEmail)
      const { data, error } = await supabase
        .from('users')
        .select('id, email, nombre_completo, role, company, is_active, created_at, last_login, admin_id, image')
        .eq('email', userEmail)
        .maybeSingle()

      if (error) {
        console.error('[Perfil] Error al cargar perfil:', error)
      } else if (data) {
        console.log('[Perfil] Profile loaded:', data)
        setUserProfile({
          id: data.id || '',
          email: data.email || '',
          nombre_completo: data.nombre_completo || '',
          role: (data.role || 'user') as 'super_admin' | 'admin' | 'user',
          company: data.company || '',
          is_active: data.is_active || false,
          created_at: data.created_at || '',
          last_login: data.last_login || '',
          admin_id: data.admin_id,
          image: data.image
        })
      }
    } catch (error) {
      console.error('[Perfil] Error inesperado:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userEmail, supabase])

  // Cargar datos del usuario actual
  useEffect(() => {
    if (userEmail && !authLoading) {
      loadUserProfile()
    }
  }, [userEmail, authLoading, loadUserProfile])

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      if (!userEmail) {
        toast.error('No se pudo identificar tu usuario.')
        return
      }

      // Actualizar SOLO campos que existen en la BD
      const updates = {
        nombre_completo: userProfile.nombre_completo || null,
        company: userProfile.company || null
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('email', userEmail)

      if (error) {
        console.error('[Perfil] Error al actualizar perfil:', error)
        toast.error('Error al actualizar el perfil')
        return
      }

      setIsEditingProfile(false)
      toast.success('Perfil actualizado exitosamente')
    } catch (error) {
      console.error('[Perfil] Error inesperado al guardar el perfil:', error)
      toast.error('Error al actualizar el perfil')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Sin datos'
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      'super_admin': 'Super Administrador',
      'admin': 'Administrador',
      'user': 'Usuario'
    }
    return roles[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'super_admin': 'bg-purple-100 text-purple-800',
      'admin': 'bg-blue-100 text-blue-800',
      'user': 'bg-green-100 text-green-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const getRoleIcon = (role: string) => {
    if (role === 'super_admin') return <Shield className="h-4 w-4" />
    if (role === 'admin') return <Building className="h-4 w-4" />
    return <User className="h-4 w-4" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-gray-600 mt-2">
            Gestiona tu información personal
          </p>
        </div>

        {/* Información Personal */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Información Personal</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Actualiza tu información de contacto
              </p>
            </div>
            <Button
              variant={isEditingProfile ? "outline" : "default"}
              onClick={() => setIsEditingProfile(!isEditingProfile)}
            >
              <Edit className="h-4 w-4 mr-2" />
              {isEditingProfile ? 'Cancelar' : 'Editar'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar y resumen */}
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {userProfile.nombre_completo || userProfile.email?.split('@')[0] || 'Sin nombre'}
                </h3>
                <p className="text-gray-600">{userProfile.email || 'Sin email'}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(userProfile.role)}`}>
                    {getRoleIcon(userProfile.role)}
                    {getRoleName(userProfile.role)}
                  </span>
                  {userProfile.admin_id && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Sub-usuario
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Campos editables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-gray-700">Nombre Completo</Label>
                <Input
                  value={userProfile.nombre_completo}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, nombre_completo: e.target.value }))}
                  disabled={!isEditingProfile}
                  className="mt-1"
                  placeholder="Tu nombre completo"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Email</Label>
                <Input
                  type="email"
                  value={userProfile.email}
                  disabled
                  className="mt-1 bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">El email no se puede cambiar</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Empresa</Label>
                <Input
                  value={userProfile.company || ''}
                  onChange={(e) => setUserProfile(prev => ({ ...prev, company: e.target.value }))}
                  disabled={!isEditingProfile}
                  className="mt-1"
                  placeholder="Nombre de tu empresa"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Rol</Label>
                <Input
                  value={getRoleName(userProfile.role)}
                  disabled
                  className="mt-1 bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">El rol es asignado por un administrador</p>
              </div>
            </div>

            {isEditingProfile && (
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingProfile(false)
                    loadUserProfile() // Recargar datos originales
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                >
                  {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información de la Cuenta */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <Label className="font-medium text-gray-700">Fecha de Registro</Label>
                <p className="text-gray-600 mt-1">
                  {formatDate(userProfile.created_at)}
                </p>
              </div>
              <div>
                <Label className="font-medium text-gray-700">Último Acceso</Label>
                <p className="text-gray-600 mt-1">
                  {formatDate(userProfile.last_login)}
                </p>
              </div>
              <div>
                <Label className="font-medium text-gray-700">Estado</Label>
                <div className="mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${userProfile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {userProfile.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
