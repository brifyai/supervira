import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const { data, error } = await supabase
            .from('noticias_scrapeadas')
            .select('id, titulo, categoria, region, fecha_scraping')
            .order('fecha_scraping', { ascending: false })
            .limit(10);

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            count: data.length,
            news: data
        });

    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Error interno' },
            { status: 500 }
        );
    }
}
