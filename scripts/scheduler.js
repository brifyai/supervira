
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });


// Configuración
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_ENDPOINT = `${API_URL}/api/cron/generate-scheduled`;
const INTERVAL_MS = 60 * 1000; // 1 minuto

console.log('🚀 Iniciando VIRA Scheduler Local');
console.log(`📍 Endpoint: ${CRON_ENDPOINT}`);
console.log(`⏱️  Intervalo: ${INTERVAL_MS / 1000} segundos`);

async function runScheduler() {
    try {
        console.log(`\n[${new Date().toLocaleTimeString()}] 🔎 Verificando tareas programadas...`);

        const response = await fetch(CRON_ENDPOINT, {
            method: 'GET',
            headers: {
                // Simular autenticación si es necesario (aunque en local suele estar abierto o usar CRON_SECRET)
                'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.tasksExecuted > 0) {
            console.log('✅ Tareas ejecutadas:', data);
        } else {
            console.log('💤 No hay tareas pendientes.');
        }

    } catch (error) {
        console.error('❌ Error en scheduler:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('⚠️  Asegúrate de que el servidor Next.js esté corriendo (yarn dev)');
        }
    }
}

// Ejecutar inmediatamente al inicio
runScheduler();

// Programar intervalo
setInterval(runScheduler, INTERVAL_MS);

// Manejar cierre limpio
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Scheduler...');
    process.exit();
});
