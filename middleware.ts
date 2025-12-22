import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })
    const path = request.nextUrl.pathname

    // ✅ FIX: Excluir rutas /api/* del refresh de token para evitar race conditions
    // Las API routes manejan su propia autenticación internamente
    if (path.startsWith('/api/')) {
        return supabaseResponse
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    // Actualizar cookies en el request
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value)
                    })
                    // Actualizar cookies en la respuesta
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        supabaseResponse.cookies.set(name, value, options)
                    })
                }
            }
        }
    )

    // Obtener usuario actual (solo para rutas de páginas, no API)
    // ✅ MEJORA: Manejar errores de token expirado sin desloguear
    let user = null
    try {
        const { data, error } = await supabase.auth.getUser()
        if (error) {
            // Si es error de token, intentar continuar sin desloguear inmediatamente
            if (error.name === 'AuthApiError' &&
                (error.message?.includes('refresh_token') ||
                    error.message?.includes('Invalid Refresh Token'))) {
                console.warn('[Middleware] Token refresh error, allowing page load:', error.message)
                // No asignar user, dejará null y puede redirigir a login si es ruta protegida
            } else {
                console.warn('[Middleware] Auth error:', error.message)
            }
        } else {
            user = data.user
        }
    } catch (e) {
        console.warn('[Middleware] Error getting user:', e)
    }

    // Rutas protegidas que requieren autenticación
    const protectedRoutes = [
        '/dashboard',
        '/admin',
        '/super-admin',
        '/perfil',
        '/crear-noticiero',
        '/timeline-noticiero',
        '/automatizacion',
        '/bibliotecas',
        '/plantillas',
        '/campanas'
    ]

    // Verificar si la ruta actual requiere autenticación
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))

    if (isProtectedRoute && !user) {
        // Redirigir a login si no está autenticado
        const redirectUrl = new URL('/auth/signin', request.url)
        redirectUrl.searchParams.set('next', path)
        return NextResponse.redirect(redirectUrl)
    }

    // Protección de rutas de Super Admin
    if (path.startsWith('/super-admin') && user) {
        // Obtener rol del usuario desde la tabla users
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userData?.role !== 'super_admin') {
            return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
    }

    // Protección de rutas de Admin
    if (path.startsWith('/admin') && user) {
        // Obtener rol del usuario desde la tabla users
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!['admin', 'super_admin'].includes(userData?.role || '')) {
            return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
    }


    // NOTA: Las API routes (/api/*) NO pasan por este middleware
    // para evitar race conditions con refresh tokens.
    // Cada API route maneja su propia autenticación internamente.

    return supabaseResponse
}

export const config = {
    matcher: [
        // Proteger rutas de dashboard y admin
        '/dashboard/:path*',
        '/super-admin/:path*',
        '/admin/:path*',
        '/perfil/:path*',
        '/crear-noticiero/:path*',
        '/timeline-noticiero/:path*',
        '/automatizacion/:path*',
        '/bibliotecas/:path*',
        '/plantillas/:path*',
        '/campanas/:path*',
        // ❌ REMOVIDO: Las API routes ahora NO pasan por el middleware
        // para evitar race conditions con refresh tokens
        // Las APIs manejan su propia autenticación con cookies
    ]
}
