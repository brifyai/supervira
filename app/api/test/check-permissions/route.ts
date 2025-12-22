import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        // Intentar leer la tabla noticias_scrapeadas
        const { data, error, count } = await supabase
            .from('noticias_scrapeadas')
            .select('*', { count: 'exact', head: true });

        if (error) {
            return NextResponse.json({
                success: false,
                message: '❌ Error de permisos o conexión',
                error: error
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: '✅ Permisos correctos',
            count: count
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: '❌ Error interno',
            error: error.message
        }, { status: 500 });
    }
}
