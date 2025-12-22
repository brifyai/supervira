'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <h1 className="text-9xl font-bold text-red-500">Error</h1>
            <p className="text-xl text-gray-600 mt-4">Algo salió mal</p>
            <div className="flex gap-4 mt-8">
                <button
                    onClick={() => reset()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Intentar de nuevo
                </button>
                <Link
                    href="/"
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                    Volver al inicio
                </Link>
            </div>
        </div>
    )
}
