import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Seed de datos básicos directamente en Supabase (sin Prisma)
// Tablas usadas: fuentes_final, radios

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function seedFuentesFinal() {
  console.log('🌱 Sembrando fuentes_final...')

  const fuentes = [
    // Región Metropolitana
    { nombre: 'Metropolitana de Santiago', nombre_fuente: 'BioBioChile', url: 'https://www.biobiochile.cl' },
    { nombre: 'Metropolitana de Santiago', nombre_fuente: 'La Tercera', url: 'https://www.latercera.com' },
    { nombre: 'Metropolitana de Santiago', nombre_fuente: 'Emol', url: 'https://www.emol.com' },

    // Valparaíso
    { nombre: 'Valparaíso', nombre_fuente: 'El Mercurio de Valparaíso', url: 'https://www.mercuriovalpo.cl' },

    // Biobío
    { nombre: 'Biobío', nombre_fuente: 'Diario Concepción', url: 'https://www.diarioconcepcion.cl' },
  ]

  const { error } = await supabase
    .from('fuentes_final')
    .insert(fuentes)

  if (error) {
    console.error('❌ Error insertando en fuentes_final:', error)
  } else {
    console.log(`✅ Insertadas ${fuentes.length} fuentes en fuentes_final`)
  }
}

async function seedRadios() {
  console.log('🌱 Sembrando radios...')

  const radios = [
    { nombre: 'Radio Santiago Noticias', frecuencia: '101.1 FM', region: 'Metropolitana de Santiago', url: 'https://www.santiagonoticias.cl' },
    { nombre: 'Radio Valparaíso', frecuencia: '96.7 FM', region: 'Valparaíso', url: 'https://www.radiovalparaiso.cl' },
    { nombre: 'Radio Concepción', frecuencia: '89.5 FM', region: 'Biobío', url: 'https://www.radioconcepcion.cl' },
  ]

  const { error } = await supabase
    .from('radios')
    .insert(radios)

  if (error) {
    console.error('❌ Error insertando en radios:', error)
  } else {
    console.log(`✅ Insertadas ${radios.length} radios`)
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando seed en Supabase...')
    await seedFuentesFinal()
    await seedRadios()
    console.log('🎉 Seed en Supabase completado')
  } catch (e) {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  }
}

main()
