'use client'

import { useState, useEffect, createContext, useContext, useMemo } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface UserData {
    id: string
    email: string
    role: 'super_admin' | 'admin' | 'user'
    nombre_completo?: string
}

interface SupabaseUserContextType {
    user: User | null
    userData: UserData | null
    isLoading: boolean
    signOut: () => Promise<void>
}

const SupabaseUserContext = createContext<SupabaseUserContextType>({
    user: null,
    userData: null,
    isLoading: true,
    signOut: async () => { }
})

export function SupabaseUserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [userData, setUserData] = useState<UserData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Crear cliente Supabase una vez
    const supabase = useMemo(() => createSupabaseBrowser(), [])

    useEffect(() => {
        let isMounted = true

        // Función para cargar datos del usuario desde la tabla users con timeout
        const loadUserData = async (authUser: User): Promise<UserData | null> => {
            try {
                console.log('[useSupabaseUser] Loading user data for:', authUser.email)

                // Crear una promesa con timeout
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('Query timeout after 5s')), 5000)
                })

                const queryPromise = supabase
                    .from('users')
                    .select('id, email, role, nombre_completo')
                    .eq('email', authUser.email)
                    .single()

                console.log('[useSupabaseUser] Query started...')
                const { data: dbUser, error } = await Promise.race([queryPromise, timeoutPromise]) as Awaited<typeof queryPromise>
                console.log('[useSupabaseUser] Query completed:', { dbUser, error: error?.message })

                if (dbUser && !error) {
                    console.log('[useSupabaseUser] User data loaded:', dbUser)
                    return dbUser as UserData
                } else {
                    // Fallback: usar metadata del usuario de Supabase Auth
                    console.warn('[useSupabaseUser] Error fetching user data:', error?.message)
                    const metadata = authUser.user_metadata
                    console.log('[useSupabaseUser] Using fallback from metadata:', metadata)
                    return {
                        id: authUser.id,
                        email: authUser.email || '',
                        role: (metadata?.role as 'super_admin' | 'admin' | 'user') || 'user',
                        nombre_completo: metadata?.full_name || authUser.email
                    }
                }
            } catch (error) {
                console.error('[useSupabaseUser] Error loading user data:', error)
                // En caso de timeout o error, usar fallback
                const metadata = authUser.user_metadata
                return {
                    id: authUser.id,
                    email: authUser.email || '',
                    role: (metadata?.role as 'super_admin' | 'admin' | 'user') || 'user',
                    nombre_completo: metadata?.full_name || authUser.email
                }
            }
        }

        // Obtener sesión inicial
        const initializeAuth = async () => {
            try {
                console.log('[useSupabaseUser] Initializing auth...')
                const { data: { user: authUser }, error } = await supabase.auth.getUser()

                if (!isMounted) return

                if (error) {
                    console.warn('[useSupabaseUser] Initial auth error:', error.message)
                    setUser(null)
                    setUserData(null)
                } else if (authUser) {
                    console.log('[useSupabaseUser] Auth user found:', authUser.email)
                    setUser(authUser)
                    const data = await loadUserData(authUser)
                    if (isMounted) {
                        setUserData(data)
                    }
                } else {
                    console.log('[useSupabaseUser] No auth user found')
                    setUser(null)
                    setUserData(null)
                }
            } catch (error) {
                console.error('[useSupabaseUser] Error in initializeAuth:', error)
                if (isMounted) {
                    setUser(null)
                    setUserData(null)
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        initializeAuth()

        // Escuchar cambios de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('[useSupabaseUser] Auth state changed:', event)

                if (!isMounted) return

                // Solo recargar datos en estos eventos específicos
                if (event === 'SIGNED_OUT') {
                    setUser(null)
                    setUserData(null)
                    setIsLoading(false)
                    return
                }

                // Ignorar TOKEN_REFRESHED - ya tenemos los datos del usuario
                if (event === 'TOKEN_REFRESHED') {
                    console.log('[useSupabaseUser] Token refreshed, skipping user data reload')
                    // Solo actualizar el user object si cambió
                    if (session?.user) {
                        setUser(session.user)
                    }
                    return
                }

                // Para SIGNED_IN o INITIAL_SESSION, cargar datos completos
                if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
                    setUser(session.user)
                    const data = await loadUserData(session.user)
                    if (isMounted) {
                        setUserData(data)
                    }
                } else if (!session?.user) {
                    setUser(null)
                    setUserData(null)
                }

                if (isMounted) {
                    setIsLoading(false)
                }
            }
        )

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [supabase])

    const handleSignOut = async () => {
        try {
            console.log('[useSupabaseUser] Signing out...')
            setIsLoading(true)

            // Cerrar sesión en Supabase primero
            const { error } = await supabase.auth.signOut()
            if (error) {
                console.error('[useSupabaseUser] SignOut error:', error)
            }

            // Limpiar estado local
            setUser(null)
            setUserData(null)

            // Pequeña demora para asegurar que cookies se limpien
            await new Promise(resolve => setTimeout(resolve, 100))

            // Redirigir a login
            window.location.href = '/auth/signin'
        } catch (error) {
            console.error('[useSupabaseUser] SignOut error:', error)
            // Forzar redirección aunque haya error
            window.location.href = '/auth/signin'
        }
    }

    return (
        <SupabaseUserContext.Provider value={{ user, userData, isLoading, signOut: handleSignOut }}>
            {children}
        </SupabaseUserContext.Provider>
    )
}

/**
 * Hook para obtener el usuario de Supabase Auth
 * Reemplaza a useSession de NextAuth
 */
export function useSupabaseUser() {
    const context = useContext(SupabaseUserContext)

    return {
        user: context.user,
        userData: context.userData,
        isLoading: context.isLoading,
        signOut: context.signOut,
        // Compatibilidad con el formato de NextAuth
        session: context.user ? {
            user: {
                id: context.userData?.id || context.user.id,
                email: context.user.email,
                name: context.userData?.nombre_completo || context.user.email,
                role: context.userData?.role || 'user'
            }
        } : null
    }
}
