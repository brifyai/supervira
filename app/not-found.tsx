'use client'

import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <h1 className="text-9xl font-bold text-blue-600">404</h1>
            <p className="text-xl text-gray-600 mt-4">Página no encontrada</p>
            <Link
                href="/"
                className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
                Volver al inicio
            </Link>
        </div>
    )
}
