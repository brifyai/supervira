import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente con service role que bypasea RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

const testNews = [
    {
        titulo: 'Gobierno anuncia nuevas medidas económicas para impulsar el crecimiento',
        contenido: 'El gobierno chileno anunció hoy un ambicioso paquete de medidas económicas destinadas a impulsar el crecimiento y controlar la inflación en el país.',
        resumen: 'Nuevas medidas económicas anunciadas por el gobierno',
        fuente: 'Emol',
        url: 'https://www.emol.com/economia/medidas-test.html',
        categoria: 'economía',
        region: 'Nacional'
    },
    {
        titulo: 'Santiago registra récord de temperatura más alta del año',
        contenido: 'La Región Metropolitana de Santiago registró hoy la temperatura más alta del año, alcanzando los 35 grados Celsius.',
        resumen: 'Récord de temperatura en la capital',
        fuente: 'La Tercera',
        url: 'https://www.latercera.com/clima/record-test.html',
        categoria: 'clima',
        region: 'Metropolitana de Santiago'
    },
    {
        titulo: 'Congreso aprueba nueva ley de educación con amplio respaldo',
        contenido: 'El Congreso Nacional aprobó hoy una nueva ley de educación que busca mejorar la calidad de la enseñanza.',
        resumen: 'Congreso aprueba nueva ley de educación',
        fuente: 'BioBioChile',
        url: 'https://www.biobiochile.cl/educacion/ley-test.html',
        categoria: 'política',
        region: 'Nacional'
    },
    {
        titulo: 'Chile lidera innovación tecnológica en América Latina',
        contenido: 'Un nuevo estudio internacional posiciona a Chile como líder en innovación tecnológica en América Latina.',
        resumen: 'Chile lidera innovación tecnológica regional',
        fuente: 'Emol',
        url: 'https://www.emol.com/tecnologia/innovacion-test.html',
        categoria: 'tecnología',
        region: 'Nacional'
    },
    {
        titulo: 'Selección chilena se prepara para partido clasificatorio',
        contenido: 'La selección chilena de fútbol intensifica entrenamientos para el crucial partido clasificatorio del fin de semana.',
        resumen: 'La Roja se prepara para partido clave',
        fuente: 'La Tercera',
        url: 'https://www.latercera.com/deportes/seleccion-test.html',
        categoria: 'deportes',
        region: 'Nacional'
    }
];

export async function POST(request: NextRequest) {
    try {
        console.log('🔄 Insertando noticias de prueba...');

        // Agregar timestamps a cada noticia
        const newsWithTimestamps = testNews.map(news => ({
            ...news,
            fecha_publicacion: new Date().toISOString(),
            fecha_scraping: new Date().toISOString()
        }));

        const { data, error } = await supabase
            .from('noticias_scrapeadas')
            .insert(newsWithTimestamps)
            .select();

        if (error) {
            console.error('❌ Error insertando noticias:', error);
            return NextResponse.json(
                { success: false, error: error.message, code: error.code },
                { status: 500 }
            );
        }

        console.log(`✅ ${data.length} noticias insertadas exitosamente!`);

        return NextResponse.json({
            success: true,
            message: `${data.length} noticias de prueba insertadas exitosamente`,
            news: data.map(n => ({
                id: n.id,
                titulo: n.titulo,
                categoria: n.categoria,
                region: n.region
            }))
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return NextResponse.json(
            { success: false, error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Endpoint para insertar noticias de prueba. Usa POST para insertar.',
        newsCount: testNews.length
    });
}
