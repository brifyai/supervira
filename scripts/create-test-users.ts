import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY environment variables.')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const TEST_USERS = [
  {
    name: 'Administrador VIRA',
    email: 'admin@vira.cl',
    password: 'admin123456',
    role: 'admin',
    company: 'VIRA',
    plan: 'enterprise'
  },
  {
    name: 'Usuario VIRA',
    email: 'user@vira.cl',
    password: 'user123456',
    role: 'user',
    company: 'VIRA',
    plan: 'free'
  }
]

async function upsertUsers() {
  for (const user of TEST_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10)

    const { error } = await supabase
      .from('users')
      .upsert(
        {
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company,
          plan: user.plan,
          nombre_completo: user.name,
          full_name: user.name,
          is_active: true,
          last_login: new Date().toISOString(),
          password: passwordHash,
          password_hash: passwordHash,
          contraseña: passwordHash
        },
        { onConflict: 'email' }
      )

    if (error) {
      console.error(`Error upserting ${user.email}:`, error.message)
      process.exitCode = 1
      return
    } else {
      console.log(`Usuario asegurado: ${user.email}`)
    }
  }

  console.log('Usuarios de prueba creados/actualizados correctamente.')
}

upsertUsers().catch((err) => {
  console.error('Error inesperado creando usuarios:', err)
  process.exit(1)
})
