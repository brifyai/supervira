#!/usr/bin/env node
/**
 * Script de Prueba del Cron Job de Scraping
 * 
 * Este script prueba el endpoint /api/cron/scrape-news
 * que es llamado automáticamente por Vercel Cron
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || '';

async function testCronJob() {
    console.log('🧪 Iniciando prueba del Cron Job de Scraping...\n');
    console.log(`📍 URL: ${BASE_URL}/api/cron/scrape-news`);

    if (!CRON_SECRET) {
        console.log('⚠️  CRON_SECRET no configurado - probando sin autenticación\n');
    } else {
        console.log('🔐 Usando CRON_SECRET configurado\n');
    }

    const startTime = Date.now();

    try {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (CRON_SECRET) {
            headers['Authorization'] = `Bearer ${CRON_SECRET}`;
        }

        console.log('🚀 Enviando request al endpoint...\n');

        const response = await fetch(`${BASE_URL}/api/cron/scrape-news`, {
            method: 'GET',
            headers
        });

        const data = await response.json();
        const duration = Date.now() - startTime;

        console.log('═'.repeat(60));
        console.log('📊 RESULTADO DEL CRON JOB');
        console.log('═'.repeat(60));

        if (response.ok && data.success) {
            console.log('✅ Estado: EXITOSO\n');

            console.log('📈 Estadísticas:');
            console.log(`   • Regiones procesadas: ${data.stats.regions_processed}`);
            console.log(`   • Noticias encontradas: ${data.stats.total_news_found}`);
            console.log(`   • Noticias nuevas: ${data.stats.total_new_news}`);
            console.log(`   • Créditos ScrapingBee: ${data.stats.total_credits_used}`);
            console.log(`   • Costo total: $${data.stats.total_cost_usd.toFixed(4)} USD`);
            console.log(`   • Tiempo ejecución: ${(data.execution_time_ms / 1000).toFixed(2)}s`);
            console.log(`   • Tiempo script: ${(duration / 1000).toFixed(2)}s\n`);

            if (data.details && data.details.length > 0) {
                console.log('📋 Detalles por región:');
                data.details.forEach(detail => {
                    console.log(`   • ${detail.region}: ${detail.new_news} nuevas de ${detail.sources_processed} fuentes`);
                });
            }

            console.log('\n✅ El cron job está funcionando correctamente!');
            process.exit(0);
        } else {
            console.log('❌ Estado: FALLIDO\n');
            console.log(`⚠️  Error: ${data.error || 'Error desconocido'}`);

            if (data.details) {
                console.log(`   Detalles: ${data.details}`);
            }

            if (response.status === 401) {
                console.log('\n💡 Sugerencia: Verifica que CRON_SECRET esté correctamente configurado');
            }

            process.exit(1);
        }

    } catch (error) {
        console.log('═'.repeat(60));
        console.log('❌ ERROR AL EJECUTAR PRUEBA');
        console.log('═'.repeat(60));
        console.error('\n', error);
        console.log('\n💡 Verifica que:');
        console.log('   1. El servidor Next.js esté corriendo (yarn dev)');
        console.log('   2. La URL base sea correcta');
        console.log('   3. Tengas fuentes activas en la base de datos');
        console.log('   4. SCRAPINGBEE_API_KEY esté configurada\n');
        process.exit(1);
    }
}

// Ejecutar test
testCronJob();
