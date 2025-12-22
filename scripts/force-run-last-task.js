
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceRunLastTask() {
    console.log('🚀 Forzando ejecución de la última tarea programada...');

    // 1. Obtener la última tarea creada
    const { data: tasks, error } = await supabase
        .from('programados')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !tasks || tasks.length === 0) {
        console.error('❌ No se encontraron tareas programadas.');
        return;
    }

    const lastTask = tasks[0];
    console.log(`📌 Tarea encontrada: "${lastTask.nombre}" (ID: ${lastTask.id})`);
    console.log(`📅 Ejecución original: ${lastTask.proxima_ejecucion}`);

    // 2. Actualizar proxima_ejecucion a hace 1 minuto
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

    const { error: updateError } = await supabase
        .from('programados')
        .update({ proxima_ejecucion: oneMinuteAgo })
        .eq('id', lastTask.id);

    if (updateError) {
        console.error('❌ Error actualizando tarea:', updateError);
        return;
    }

    console.log(`✅ Tarea actualizada!`);
    console.log(`🕒 Nueva fecha de ejecución: ${oneMinuteAgo}`);
    console.log(`\n👉 Ahora revisa la consola donde corre 'yarn scheduler', debería recogerla en el próximo minuto.`);
}

forceRunLastTask();
