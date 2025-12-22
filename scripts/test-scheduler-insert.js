
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testInsertAndSchedule() {
    console.log('🧪 Iniciando prueba de inserción de tarea programada...');

    // 1. Obtener un usuario válido (el primero que encontremos)
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError || !users || users.length === 0) {
        console.error('❌ No se pudieron listar usuarios para la prueba.');
        return;
    }

    const testUser = users[0];
    console.log(`👤 Usando usuario de prueba: ${testUser.email} (${testUser.id})`);

    // 2. Insertar una tarea programada para "ahora mismo" (o hace 1 minuto)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const taskPayload = {
        nombre: `TEST AUTOMATIZADO - ${now.toISOString()}`,
        tipo: 'noticiero',
        horario: '09:00',
        esta_activo: true,
        user_id: testUser.id,
        usuario: testUser.email,
        proxima_ejecucion: oneMinuteAgo.toISOString(), // Para que se ejecute YA
        configuracion: {
            frecuencia: 'daily',
            hora_generacion: '09:00',
            email: testUser.email,
            test_run: true
        },
        total_ejecuciones: 0,
        ejecuciones_exitosas: 0
    };

    const { data: insertedTask, error: insertError } = await supabase
        .from('programados')
        .insert(taskPayload)
        .select()
        .single();

    if (insertError) {
        console.error('❌ Error insertando tarea:', insertError);
        return;
    }

    console.log(`✅ Tarea insertada correctamente ID: ${insertedTask.id}`);
    console.log(`📅 Próxima ejecución: ${insertedTask.proxima_ejecucion}`);

    console.log('\n⏳ Esperando 5 segundos antes de verificar...');
    // No podemos ejecutar el scheduler real desde aquí fácilmente porque es otro proceso,
    // pero podemos verificar si el registro está correcto en la DB.

    // Validar campos críticos
    if (insertedTask.user_id === testUser.id && insertedTask.usuario === testUser.email) {
        console.log('✅ Validación: user_id y usuario guardados correctamente.');
    } else {
        console.error('❌ Validación FALLIDA: user_id o usuario no coinciden.');
    }

    console.log('\n🧹 Limpiando tarea de prueba...');
    await supabase.from('programados').delete().eq('id', insertedTask.id);
    console.log('✅ Tarea de prueba eliminada.');
}

testInsertAndSchedule();
