// Script para insertar noticias de prueba en Supabase
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const testNews = [
    {
        titulo: 'Gobierno anuncia nuevas medidas económicas para impulsar el crecimiento',
        contenido: 'El gobierno chileno anunció hoy un ambicioso paquete de medidas económicas destinadas a impulsar el crecimiento y controlar la inflación en el país. Las medidas incluyen incentivos fiscales para pequeñas y medianas empresas, ajustes en las tasas de interés, y programas de apoyo para sectores estratégicos. El Ministro de Hacienda señaló que estas iniciativas buscan fortalecer la economía nacional y generar nuevas oportunidades de empleo. Los analistas económicos han recibido positivamente el anuncio, aunque algunos expresan cautela sobre la implementación de las medidas. Se espera que el impacto de estas políticas se vea reflejado en los próximos trimestres.',
        resumen: 'Nuevas medidas económicas anunciadas por el gobierno para impulsar crecimiento',
        fuente: 'Emol',
        url: 'https://www.emol.com/noticias/economia/2024/11/20/medidas-economicas.html',
        categoria: 'economía',
        region: 'Nacional',
        fecha_publicacion: new Date().toISOString(),
        fecha_scraping: new Date().toISOString()
    },
    {
        titulo: 'Santiago registra récord de temperatura más alta del año',
        contenido: 'La Región Metropolitana de Santiago registró hoy la temperatura más alta del año, alcanzando los 35 grados Celsius en varias comunas. Las autoridades sanitarias han emitido alertas recomendando a la población mantenerse hidratada, evitar la exposición prolongada al sol durante las horas de mayor calor, y prestar especial atención a niños y adultos mayores. Los servicios de emergencia reportaron un aumento en las consultas relacionadas con golpes de calor. La Dirección Meteorológica de Chile indica que estas altas temperaturas se mantendrán durante los próximos días, por lo que se recomienda tomar precauciones adicionales.',
        resumen: 'Récord de temperatura en la capital, autoridades emiten recomendaciones',
        fuente: 'La Tercera',
        url: 'https://www.latercera.com/clima/2024/11/20/record-temperatura.html',
        categoria: 'clima',
        region: 'Metropolitana de Santiago',
        fecha_publicacion: new Date().toISOString(),
        fecha_scraping: new Date().toISOString()
    },
    {
        titulo: 'Congreso aprueba nueva ley de educación con amplio respaldo',
        contenido: 'El Congreso Nacional aprobó hoy una nueva ley de educación que busca mejorar la calidad de la enseñanza y aumentar el acceso a la educación superior en todo el país. La iniciativa, que contó con amplio respaldo transversal, establece nuevos estándares de calidad para instituciones educativas, aumenta el financiamiento para becas estudiantiles, y crea programas de apoyo para estudiantes de sectores vulnerables. La ley entrará en vigencia el próximo año académico. El Ministro de Educación destacó que esta reforma representa un paso importante hacia la equidad educativa. Organizaciones estudiantiles y de profesores han expresado su satisfacción con la aprobación.',
        resumen: 'Congreso aprueba nueva ley de educación con amplio respaldo político',
        fuente: 'BioBioChile',
        url: 'https://www.biobiochile.cl/educacion/2024/11/20/ley-educacion.html',
        categoria: 'política',
        region: 'Nacional',
        fecha_publicacion: new Date().toISOString(),
        fecha_scraping: new Date().toISOString()
    },
    {
        titulo: 'Chile lidera innovación tecnológica en América Latina según nuevo ranking',
        contenido: 'Un nuevo estudio internacional posiciona a Chile como líder en innovación tecnológica en América Latina. El informe destaca el crecimiento del ecosistema de startups, la inversión en investigación y desarrollo, y las políticas públicas que fomentan la transformación digital. Empresas tecnológicas chilenas han captado importantes inversiones extranjeras este año, consolidando al país como un hub de innovación regional. El Ministerio de Ciencia y Tecnología celebró los resultados y anunció nuevos programas para fortalecer el sector. Expertos señalan que este liderazgo se debe a la combinación de talento local, infraestructura adecuada y apoyo gubernamental.',
        resumen: 'Chile lidera innovación tecnológica en la región según estudio internacional',
        fuente: 'Emol',
        url: 'https://www.emol.com/tecnologia/2024/11/20/innovacion-chile.html',
        categoria: 'tecnología',
        region: 'Nacional',
        fecha_publicacion: new Date().toISOString(),
        fecha_scraping: new Date().toISOString()
    },
    {
        titulo: 'Selección chilena se prepara para importante partido clasificatorio',
        contenido: 'La selección chilena de fútbol intensifica sus entrenamientos de cara al crucial partido clasificatorio que se disputará este fin de semana. El técnico nacional ha convocado a los mejores jugadores del momento y trabaja en estrategias específicas para enfrentar al rival. Los jugadores mostraron optimismo en conferencia de prensa y aseguraron estar preparados para dar lo mejor en la cancha. Miles de hinchas se preparan para apoyar al equipo en el estadio nacional. Este partido es clave para las aspiraciones clasificatorias del equipo chileno en el torneo internacional.',
        resumen: 'La Roja se prepara para partido clasificatorio clave del fin de semana',
        fuente: 'La Tercera',
        url: 'https://www.latercera.com/deportes/2024/11/20/seleccion-chile.html',
        categoria: 'deportes',
        region: 'Nacional',
        fecha_publicacion: new Date().toISOString(),
        fecha_scraping: new Date().toISOString()
    }
];

async function insertTestNews() {
    console.log('🔄 Insertando noticias de prueba...');

    const { data, error } = await supabase
        .from('noticias_scrapeadas')
        .insert(testNews)
        .select();

    if (error) {
        console.error('❌ Error insertando noticias:', error);
        process.exit(1);
    }

    console.log(`✅ ${data.length} noticias insertadas exitosamente!`);
    console.log('\nNoticias insertadas:');
    data.forEach((news, index) => {
        console.log(`${index + 1}. ${news.titulo} (${news.categoria})`);
    });

    process.exit(0);
}

insertTestNews();
