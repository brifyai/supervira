import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const testNewscast = {
            titulo: 'Noticiero de Prueba Directa',
            contenido: 'Contenido de prueba',
            datos_timeline: [],
            duracion_segundos: 100,
            estado: 'generado',
            user_id: '00000000-0000-0000-0000-000000000000', // UUID válido de prueba
            costo_generacion: 0,
            total_tokens: 0,
            metadata: { test: true }
        };

        console.log('Intentando insertar noticiero de prueba:', testNewscast);

        const { data, error } = await supabase
            .from('noticieros')
            .insert(testNewscast)
            .select()
            .single();

        if (error) {
            console.error('❌ Error Supabase:', error);
            return NextResponse.json({
                success: false,
                error_code: error.code,
                error_message: error.message,
                error_details: error.details,
                error_hint: error.hint
            });
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('❌ Error Catch:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
