
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json()

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'El usuario ya existe' },
        { status: 400 }
      )
    }

    // Usar Supabase Auth para crear el usuario
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`
      }
    })

    if (authError) {
      console.error('Supabase Auth error:', authError)
      return NextResponse.json(
        { error: 'Error al crear usuario: ' + authError.message },
        { status: 500 }
      )
    }

    // Crear registro en la tabla users
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        nombre_completo: `${firstName} ${lastName}`,
        email_verified: new Date().toISOString(),
        role: 'admin',  // Nuevos registros son admins (dueños de cuenta)
        is_active: true
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user profile:', userError)
      // Si falla la creación del perfil, eliminar el usuario de auth
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json(
        { error: 'Error al crear perfil de usuario' },
        { status: 500 }
      )
    }

    // Retornar éxito sin la contraseña
    return NextResponse.json({
      message: 'Usuario creado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        nombre_completo: user.nombre_completo,
      }
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
