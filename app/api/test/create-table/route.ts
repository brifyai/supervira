import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        console.log('🔄 Creando tabla noticias_scrapeadas...');

        // Crear la tabla usando SQL directo
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS "noticias_scrapeadas" (
          "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "titulo" TEXT NOT NULL,
          "contenido" TEXT,
          "resumen" TEXT,
          "fuente" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "categoria" TEXT,
          "region" TEXT NOT NULL,
          "fecha_publicacion" TIMESTAMPTZ DEFAULT NOW(),
          "fecha_scraping" TIMESTAMPTZ DEFAULT NOW(),
          "metadata" JSONB DEFAULT '{}',
          "created_at" TIMESTAMPTZ DEFAULT NOW(),
          "updated_at" TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_noticias_region ON "noticias_scrapeadas"("region");
      CREATE INDEX IF NOT EXISTS idx_noticias_categoria ON "noticias_scrapeadas"("categoria");
      CREATE INDEX IF NOT EXISTS idx_noticias_fecha_pub ON "noticias_scrapeadas"("fecha_publicacion" DESC);
      
      ALTER TABLE "noticias_scrapeadas" DISABLE ROW LEVEL SECURITY;
    `;

        const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });

        if (error) {
            // Si RPC no existe, intentar crear directamente
            console.log('⚠️ RPC no disponible, la tabla debe crearse manualmente en Supabase SQL Editor');
            return NextResponse.json({
                success: false,
                message: 'Por favor ejecuta el SQL manualmente en Supabase',
                sql: createTableSQL
            });
        }

        console.log('✅ Tabla creada exitosamente');

        return NextResponse.json({
            success: true,
            message: 'Tabla noticias_scrapeadas creada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error creando tabla',
                message: 'Ejecuta create_noticias_table.sql manualmente en Supabase SQL Editor'
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Endpoint para crear tabla noticias_scrapeadas. Usa POST.',
        note: 'O ejecuta create_noticias_table.sql manualmente en Supabase'
    });
}
