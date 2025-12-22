import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        const { data, error } = await supabase
            .from('noticieros')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ success: true, message: 'No hay noticieros aún' });
        }

        return NextResponse.json({
            success: true,
            newscast: data[0]
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
