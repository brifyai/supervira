/**
 * Script para crear/actualizar usuario admin
 * Ejecutar con: npx tsx scripts/setup-admin.ts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
})

async function setupAdmin() {
    const email = 'matiaszurita931@gmail.com'
    const password = 'Admin123'

    console.log('🔧 Configurando usuario admin:', email)

    try {
        // 1. Buscar usuario existente
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()

        if (listError) {
            console.error('❌ Error listando usuarios:', listError)
            return
        }

        const existingUser = existingUsers.users.find(u => u.email === email)

        let userId: string

        if (existingUser) {
            console.log('📋 Usuario existente encontrado:', existingUser.id)
            userId = existingUser.id

            // Actualizar metadata y contraseña
            const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
                password,
                user_metadata: {
                    role: 'admin',
                    full_name: 'Admin'
                },
                email_confirm: true
            })

            if (updateError) {
                console.error('❌ Error actualizando usuario:', updateError)
                return
            }
            console.log('✅ Usuario actualizado con rol admin y nueva contraseña')
        } else {
            // Crear nuevo usuario
            console.log('📝 Creando nuevo usuario...')
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                    role: 'admin',
                    full_name: 'Admin'
                }
            })

            if (createError) {
                console.error('❌ Error creando usuario:', createError)
                return
            }

            userId = newUser.user.id
            console.log('✅ Usuario creado:', userId)
        }

        // 2. Crear/actualizar registro en tabla users
        const { error: upsertError } = await supabase
            .from('users')
            .upsert({
                id: userId,
                email,
                role: 'admin',
                nombre_completo: 'Admin',
                is_active: true,
                created_at: new Date().toISOString()
            }, { onConflict: 'id' })

        if (upsertError) {
            console.error('❌ Error actualizando tabla users:', upsertError)
            return
        }

        console.log('✅ Registro en tabla users actualizado')
        console.log('')
        console.log('🎉 ¡Configuración completada!')
        console.log('📧 Email:', email)
        console.log('🔑 Password:', password)
        console.log('👑 Rol: admin')

    } catch (error) {
        console.error('❌ Error inesperado:', error)
    }
}

setupAdmin()
