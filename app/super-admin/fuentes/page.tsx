'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Fuente {
    id: string
    region: string
    nombre_fuente: string
    url: string
    rss_url: string | null
    tipo_scraping: 'rss' | 'web' | 'ambos'
    selectores_css: {
        titulo?: string[]      // Para preview (escaneo de homepage)
        contenido?: string[]   // Para deep scraping
        eliminar?: string[]    // Para deep scraping
    }
    usa_premium_proxy: boolean
    estado_test: 'pendiente' | 'exitoso' | 'fallido'
    ultimo_test: string | null
    esta_activo: boolean
}

interface TestResult {
    success: boolean
    previewOk?: boolean
    deepOk?: boolean
    rssOk?: boolean
    results: {
        method: string
        success: boolean
        count?: number
        chars?: number
        preview: string
        error?: string
        selector_used?: string
    }[]
    recommendation: string
    debug?: {
        homepage_url: string
        article_url: string
        html_size: string
        containers_found?: string[]
        html_sample: string
    }
}

const REGIONES = [
    'Nacional', 'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama',
    'Coquimbo', 'Valparaíso', 'Metropolitana de Santiago', "O'Higgins",
    'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos',
    'Aysén', 'Magallanes y Antártica Chilena'
]

export default function FuentesPage() {
    const router = useRouter()
    const [fuentes, setFuentes] = useState<Fuente[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [editingFuente, setEditingFuente] = useState<Fuente | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [testing, setTesting] = useState<string | null>(null)
    const [testResult, setTestResult] = useState<TestResult | null>(null)
    const [filterRegion, setFilterRegion] = useState('')

    // Formulario
    const [formData, setFormData] = useState({
        region: 'Nacional',
        nombre_fuente: '',
        url: '',
        rss_url: '',
        tipo_scraping: 'web' as 'rss' | 'web' | 'ambos',
        selectores_titulo: '',      // NUEVO: Para preview
        selectores_contenido: '',
        selectores_eliminar: '',
        usa_premium_proxy: false
    })

    useEffect(() => {
        fetchFuentes()
    }, [])

    async function fetchFuentes() {
        try {
            const res = await fetch('/api/super-admin/fuentes')
            if (!res.ok) {
                if (res.status === 401) {
                    router.push('/auth/signin')
                    return
                }
                throw new Error('Error cargando fuentes')
            }
            const data = await res.json()
            setFuentes(data)
        } catch (err) {
            setError('Error cargando fuentes')
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        const payload = {
            ...editingFuente,
            region: formData.region,
            nombre_fuente: formData.nombre_fuente,
            url: formData.url,
            rss_url: formData.rss_url || null,
            tipo_scraping: formData.tipo_scraping,
            selectores_css: {
                titulo: formData.selectores_titulo.split(',').map(s => s.trim()).filter(Boolean),
                contenido: formData.selectores_contenido.split(',').map(s => s.trim()).filter(Boolean),
                eliminar: formData.selectores_eliminar.split(',').map(s => s.trim()).filter(Boolean)
            },
            usa_premium_proxy: formData.usa_premium_proxy
        }

        try {
            const res = await fetch('/api/super-admin/fuentes', {
                method: editingFuente ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error('Error guardando')

            setShowModal(false)
            setEditingFuente(null)
            resetForm()
            fetchFuentes()
        } catch (err) {
            setError('Error guardando fuente')
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar esta fuente?')) return

        try {
            const res = await fetch(`/api/super-admin/fuentes?id=${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Error eliminando')
            fetchFuentes()
        } catch (err) {
            setError('Error eliminando fuente')
        }
    }

    async function handleTest(fuente: Fuente) {
        setTesting(fuente.id)
        setTestResult(null)

        try {
            const res = await fetch('/api/super-admin/test-scraping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: fuente.url,
                    rss_url: fuente.rss_url,
                    tipo_scraping: fuente.tipo_scraping,
                    selectores_css: fuente.selectores_css
                })
            })

            const result = await res.json()
            setTestResult(result)

            // Actualizar estado en DB
            await fetch('/api/super-admin/fuentes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: fuente.id,
                    estado_test: result.success ? 'exitoso' : 'fallido',
                    ultimo_test: new Date().toISOString()
                })
            })

            fetchFuentes()
        } catch (err) {
            setTestResult({ success: false, results: [], recommendation: 'Error en prueba' })
        } finally {
            setTesting(null)
        }
    }

    function openEditModal(fuente: Fuente) {
        setEditingFuente(fuente)
        setFormData({
            region: fuente.region,
            nombre_fuente: fuente.nombre_fuente,
            url: fuente.url,
            rss_url: fuente.rss_url || '',
            tipo_scraping: fuente.tipo_scraping,
            selectores_titulo: fuente.selectores_css?.titulo?.join(', ') || '',
            selectores_contenido: fuente.selectores_css?.contenido?.join(', ') || '',
            selectores_eliminar: fuente.selectores_css?.eliminar?.join(', ') || '',
            usa_premium_proxy: fuente.usa_premium_proxy
        })
        setShowModal(true)
    }

    function openNewModal() {
        setEditingFuente(null)
        resetForm()
        setShowModal(true)
    }

    function resetForm() {
        setFormData({
            region: 'Nacional',
            nombre_fuente: '',
            url: '',
            rss_url: '',
            tipo_scraping: 'web',
            selectores_titulo: '',
            selectores_contenido: '',
            selectores_eliminar: '',
            usa_premium_proxy: false
        })
    }

    const filteredFuentes = filterRegion
        ? fuentes.filter(f => f.region === filterRegion)
        : fuentes

    const estadoIcon = (estado: string) => {
        switch (estado) {
            case 'exitoso': return '✅'
            case 'fallido': return '❌'
            default: return '⏳'
        }
    }

    if (loading) return <div className="p-8 text-white">Cargando...</div>

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">📰 Gestión de Fuentes</h1>
                        <p className="text-gray-400 mt-1">Configura selectores CSS y RSS para cada fuente</p>
                    </div>
                    <button
                        onClick={openNewModal}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium"
                    >
                        + Nueva Fuente
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded mb-4">
                        {error}
                    </div>
                )}

                {/* Filtros */}
                <div className="mb-6 flex gap-4">
                    <select
                        value={filterRegion}
                        onChange={(e) => setFilterRegion(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
                    >
                        <option value="">Todas las regiones</option>
                        {REGIONES.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                    <span className="text-gray-400 self-center">
                        {filteredFuentes.length} fuentes
                    </span>
                </div>

                {/* Tabla */}
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="text-left px-4 py-3">Fuente</th>
                                <th className="text-left px-4 py-3">Región</th>
                                <th className="text-left px-4 py-3">Tipo</th>
                                <th className="text-center px-4 py-3">Estado</th>
                                <th className="text-right px-4 py-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFuentes.map(fuente => (
                                <tr key={fuente.id} className="border-t border-gray-700 hover:bg-gray-750">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{fuente.nombre_fuente}</div>
                                        <div className="text-sm text-gray-400 truncate max-w-xs">{fuente.url}</div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">{fuente.region}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs ${fuente.tipo_scraping === 'rss' ? 'bg-green-500/20 text-green-400' :
                                            fuente.tipo_scraping === 'ambos' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {fuente.tipo_scraping.toUpperCase()}
                                        </span>
                                        {fuente.rss_url && <span className="ml-2 text-green-400">📡</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center text-xl">
                                        {estadoIcon(fuente.estado_test)}
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        <button
                                            onClick={() => handleTest(fuente)}
                                            disabled={testing === fuente.id}
                                            className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm disabled:opacity-50"
                                        >
                                            {testing === fuente.id ? '⏳' : '🧪 Test'}
                                        </button>
                                        <button
                                            onClick={() => openEditModal(fuente)}
                                            className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-sm"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(fuente.id)}
                                            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Test Result */}
                {testResult && (
                    <div className={`mt-6 p-4 rounded-lg ${testResult.success ? 'bg-green-500/20 border border-green-500' : 'bg-yellow-500/20 border border-yellow-500'}`}>
                        <div className="flex items-center gap-4 mb-3">
                            <h3 className="font-bold text-lg">Resultado del Test</h3>
                            <div className="flex gap-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${testResult.previewOk ? 'bg-green-600' : 'bg-red-600'}`}>
                                    Preview: {testResult.previewOk ? '✅' : '❌'}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${testResult.deepOk ? 'bg-green-600' : 'bg-red-600'}`}>
                                    Deep: {testResult.deepOk ? '✅' : '❌'}
                                </span>
                            </div>
                        </div>
                        {testResult.results.map((r, i) => (
                            <div key={i} className="mb-3 p-3 bg-gray-900/50 rounded">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{r.method}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${r.success ? 'bg-green-600' : 'bg-red-600'}`}>
                                        {r.success ? '✅ OK' : '❌ Fallo'}
                                    </span>
                                    {r.count !== undefined && (
                                        <span className="text-blue-400 text-sm">{r.count} noticias</span>
                                    )}
                                    {r.chars !== undefined && (
                                        <span className="text-purple-400 text-sm">{r.chars} chars</span>
                                    )}
                                </div>
                                {r.selector_used && (
                                    <div className="text-xs text-cyan-400 mt-1">Selector: {r.selector_used}</div>
                                )}
                                {r.preview && (
                                    <div className="text-sm text-gray-400 mt-1 line-clamp-2">{r.preview}</div>
                                )}
                                {r.error && (
                                    <div className="text-sm text-red-400 mt-1">Error: {r.error}</div>
                                )}
                            </div>
                        ))}
                        <div className={`mt-3 p-2 rounded font-medium ${testResult.success ? 'bg-green-600/30' : 'bg-yellow-600/30'}`}>
                            {testResult.recommendation}
                        </div>

                        {/* Debug Info */}
                        {testResult.debug && (
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm text-gray-400 hover:text-white">
                                    🔧 Debug Info (click para expandir)
                                </summary>
                                <div className="mt-2 p-3 bg-gray-900 rounded text-xs font-mono">
                                    <div className="text-cyan-400 mb-1">Homepage: {testResult.debug.homepage_url}</div>
                                    <div className="text-green-400 mb-1">Artículo testeado: {testResult.debug.article_url}</div>
                                    <div className="text-purple-400 mb-2">HTML del artículo: {testResult.debug.html_size}</div>

                                    {/* Contenedores encontrados */}
                                    {testResult.debug.containers_found && testResult.debug.containers_found.length > 0 && (
                                        <div className="mb-3">
                                            <div className="text-orange-400 mb-1">📦 Contenedores detectados (usa estos como selectores):</div>
                                            <ul className="list-disc list-inside text-green-300">
                                                {testResult.debug.containers_found.map((c: string, i: number) => (
                                                    <li key={i}>{c}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="text-gray-400">
                                        <div className="mb-1 text-yellow-400">Contenido del artículo (2000 chars):</div>
                                        <div className="whitespace-pre-wrap break-words max-h-60 overflow-y-auto text-gray-300">
                                            {testResult.debug.html_sample}
                                        </div>
                                    </div>
                                </div>
                            </details>
                        )}
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <h2 className="text-xl font-bold mb-4">
                                {editingFuente ? 'Editar Fuente' : 'Nueva Fuente'}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                                        <input
                                            type="text"
                                            value={formData.nombre_fuente}
                                            onChange={e => setFormData({ ...formData, nombre_fuente: e.target.value })}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Región</label>
                                        <select
                                            value={formData.region}
                                            onChange={e => setFormData({ ...formData, region: e.target.value })}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                                        >
                                            {REGIONES.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">URL Principal</label>
                                    <input
                                        type="url"
                                        value={formData.url}
                                        onChange={e => setFormData({ ...formData, url: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                                        placeholder="https://ejemplo.cl"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">URL RSS (opcional)</label>
                                    <input
                                        type="url"
                                        value={formData.rss_url}
                                        onChange={e => setFormData({ ...formData, rss_url: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                                        placeholder="https://ejemplo.cl/feed/"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Tipo de Scraping</label>
                                    <select
                                        value={formData.tipo_scraping}
                                        onChange={e => setFormData({ ...formData, tipo_scraping: e.target.value as any })}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                                    >
                                        <option value="rss">RSS (usa solo RSS)</option>
                                        <option value="web">Web (usa ScrapingBee)</option>
                                        <option value="ambos">Ambos (RSS primero, web como fallback)</option>
                                    </select>
                                </div>

                                {/* NUEVO: Selector para Preview */}
                                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                                    <label className="block text-sm text-blue-300 mb-1 font-medium">
                                        🔍 Selector para Preview (lista de noticias)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.selectores_titulo}
                                        onChange={e => setFormData({ ...formData, selectores_titulo: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                                        placeholder="h2 a, .headline a, article h3 a"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        CSS selector para encontrar links de noticias en la homepage. Si está vacío, usa detección automática.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">
                                        Selectores de Contenido - Deep Scraping (separados por coma)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.selectores_contenido}
                                        onChange={e => setFormData({ ...formData, selectores_contenido: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                                        placeholder=".article-body, .entry-content, #main-content"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">
                                        Selectores a Eliminar (separados por coma)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.selectores_eliminar}
                                        onChange={e => setFormData({ ...formData, selectores_eliminar: e.target.value })}
                                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                                        placeholder=".ads, .sidebar, nav, footer"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="premium"
                                        checked={formData.usa_premium_proxy}
                                        onChange={e => setFormData({ ...formData, usa_premium_proxy: e.target.checked })}
                                        className="w-4 h-4"
                                    />
                                    <label htmlFor="premium" className="text-sm text-gray-400">
                                        Usar Premium Proxy (10x créditos, mejor para sitios difíciles)
                                    </label>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                                    >
                                        {editingFuente ? 'Guardar' : 'Crear'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
