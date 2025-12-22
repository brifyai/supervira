
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withPermission, createSuccessResponse, createErrorResponse } from '@/lib/auth-middleware'

// Crear cliente de Supabase con Service Role Key para operaciones de backend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  return withPermission('users:read', async (request, user) => {
    try {
      // Si es super_admin, puede ver todos los usuarios
      // Si es admin, solo ve los usuarios que dependen de él (admin_id = user.id)
      let query = supabase
        .from('users')
        .select('id, nombre_completo, email, role, company, is_active, created_at, last_login, admin_id')
        .order('created_at', { ascending: false })

      // Filtrar por admin_id si el usuario actual es admin (no super_admin)
      if (user.role === 'admin') {
        console.log('[GET /api/users] Filtrando por admin_id:', user.id, 'para usuario:', user.email)
        query = query.eq('admin_id', user.id)
      } else {
        console.log('[GET /api/users] Super admin, sin filtro')
      }

      const { data: users, error: usersError } = await query

      console.log('[GET /api/users] Usuarios encontrados:', users?.length || 0)

      if (usersError) {
        console.error('Error obteniendo usuarios:', usersError)
        return createErrorResponse('Error al obtener usuarios', 500)
      }

      return createSuccessResponse({ users: users || [] })

    } catch (error) {
      console.error('Error en GET /api/users:', error)
      return createErrorResponse('Error interno del servidor', 500)
    }
  })(request)
}


export async function POST(request: NextRequest) {
  return withPermission('users:write', async (request, currentUser) => {
    try {
      const { name, email, password, role } = await request.json()

      // Validaciones básicas
      if (!name || !email || !password || !role) {
        return createErrorResponse('Faltan campos requeridos (nombre, email, contraseña, rol)', 400)
      }

      // Validar contraseña
      if (password.length < 6) {
        return createErrorResponse('La contraseña debe tener al menos 6 caracteres', 400)
      }

      // Validar rol usando el nuevo sistema
      if (!['admin', 'user'].includes(role)) {
        return createErrorResponse('Rol inválido', 400)
      }

      // Verificar si el email ya existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .single()

      if (existingUser) {
        return createErrorResponse('El email ya está en uso', 400)
      }

      // Crear nuevo usuario en Supabase Auth con la contraseña proporcionada
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (authError) {
        console.error('Error creando usuario en Supabase Auth:', authError)
        return createErrorResponse('Error al crear usuario en auth', 500)
      }

      // Crear registro en la tabla users
      // Si el rol es 'user', se vincula con el admin que lo crea (admin_id)
      const adminIdToSave = role === 'user' ? currentUser.id : null
      console.log('[POST /api/users] Creando usuario con admin_id:', adminIdToSave, 'por admin:', currentUser.email, 'ID:', currentUser.id)

      const { data: newUser, error: dbError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email,
          role,
          company: currentUser.company || 'VIRA',
          nombre_completo: name,
          is_active: true,
          admin_id: adminIdToSave,
          last_login: new Date().toISOString()
        })
        .select()
        .single()

      if (dbError) {
        console.error('Error creando usuario en base de datos:', dbError)
        // Intentar rollback del usuario de auth
        await supabase.auth.admin.deleteUser(authUser.user.id)
        return createErrorResponse('Error al crear usuario', 500)
      }

      return createSuccessResponse({
        user: newUser,
        message: 'Usuario creado exitosamente'
      })

    } catch (error) {
      console.error('Error en POST /api/users:', error)
      return createErrorResponse('Error interno del servidor', 500)
    }
  })(request)
}
