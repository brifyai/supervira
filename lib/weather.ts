// Server-only module - cannot be imported by client components
import 'server-only';

// API key from environment variable (no fallback - must be set in env)
const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

if (!API_KEY) {
  console.warn('⚠️ OPENWEATHER_API_KEY not configured - weather feature disabled');
}

// Mapeo de regiones a ciudades capitales para el clima
const REGION_TO_CITY: { [key: string]: string } = {
    'Arica y Parinacota': 'Arica,CL',
    'Tarapacá': 'Iquique,CL',
    'Antofagasta': 'Antofagasta,CL',
    'Atacama': 'Copiapo,CL',
    'Coquimbo': 'La Serena,CL',
    'Valparaíso': 'Valparaiso,CL',
    'Metropolitana de Santiago': 'Santiago,CL',
    'O\'Higgins': 'Rancagua,CL',
    'Maule': 'Talca,CL',
    'Ñuble': 'Chillan,CL',
    'Biobío': 'Concepcion,CL',
    'Araucanía': 'Temuco,CL',
    'Los Ríos': 'Valdivia,CL',
    'Los Lagos': 'Puerto Montt,CL',
    'Aysén': 'Coyhaique,CL',
    'Magallanes': 'Punta Arenas,CL',
    'Nacional': 'Santiago,CL' // Default para nacional
};

export async function getWeather(region: string): Promise<string | null> {
    try {
        const city = REGION_TO_CITY[region] || 'Santiago,CL';
        const url = `${BASE_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=es`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Weather API error: ${response.statusText}`);
        }

        const data = await response.json();
        const { temp } = data.main;
        const description = data.weather[0].description;
        const roundedTemp = Math.round(temp);

        // Formato: "con 18 grados y cielo despejado"
        return `con ${roundedTemp} grados y ${description}`;
    } catch (error) {
        console.error(`Error fetching weather for ${region}:`, error);
        return null;
    }
}
