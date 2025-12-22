'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Shield, Users, FileText, DollarSign, Radio, Plus, Settings,
  TrendingUp, Mic, Crown, Newspaper, Clock, Building, FolderOpen, BookOpen, Zap
} from 'lucide-react'

// Widgets
import { MetricsCards } from './metrics-cards'
import { AIUsageWidget } from './ai-usage-widget'
import { ProductionLeaders } from './production-leaders'
import { ResourceBreakdown } from './resource-breakdown'
import { AdvertisingReport } from './advertising-report'
import { TimeFilters } from './time-filters'

interface DashboardProps {
  className?: string
  role?: string
}

export function DashboardByRole({ role, className }: DashboardProps) {
  if (role === 'super_admin') return <SuperAdminDashboard className={className} />
  if (role === 'admin') return <AdminDashboard className={className} />
  return <UserDashboard className={className} />
}

// =====================================================
// SUPER ADMIN DASHBOARD - Vista global del sistema
// =====================================================
function SuperAdminDashboard({ className }: DashboardProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalUsers: 0,
    totalNoticieros: 0,
    totalNewsScraped: 0,
    totalCostUSD: 0,
    activeSourcesCount: 0
  })

  useEffect(() => {
    const fetchGlobalStats = async () => {
      setLoading(true)
      try {
        // Obtener estadísticas globales del sistema
        const [usersRes, newsRes, noticieroRes] = await Promise.all([
          fetch('/api/admin/system-stats'),
          fetch('/api/news-stats'),
          fetch('/api/reports?limit=1000')
        ])

        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setStats(prev => ({
            ...prev,
            totalAdmins: usersData.totalAdmins || 0,
            totalUsers: usersData.totalUsers || 0,
            totalCostUSD: usersData.totalCostUSD || 0
          }))
        }

        if (newsRes.ok) {
          const newsData = await newsRes.json()
          setStats(prev => ({
            ...prev,
            totalNewsScraped: newsData.total || 0,
            activeSourcesCount: newsData.sourcesCount || 0
          }))
        }

        if (noticieroRes.ok) {
          const noticieroData = await noticieroRes.json()
          setStats(prev => ({
            ...prev,
            totalNoticieros: noticieroData.reports?.length || 0
          }))
        }
      } catch (error) {
        console.error('Error fetching global stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGlobalStats()
  }, [])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Panel Super Administrador</h1>
              <p className="text-muted-foreground">Vista global del sistema VIRA</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/super-admin/config">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </Button>
          </Link>
          <Link href="/super-admin/fuentes">
            <Button>
              <Newspaper className="mr-2 h-4 w-4" />
              Gestión Fuentes
            </Button>
          </Link>
        </div>
      </div>

      {/* Métricas Globales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Building className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalAdmins}</div>
            <p className="text-xs text-muted-foreground">Cuentas activas del sistema</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Incluyendo sub-usuarios</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Noticias Scrapeadas</CardTitle>
            <Newspaper className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalNewsScraped.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">De {stats.activeSourcesCount} fuentes activas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Noticieros Generados</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalNoticieros}</div>
            <p className="text-xs text-muted-foreground">Total del sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* Accesos Rápidos */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/super-admin/config">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-2 hover:border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5 text-purple-500" />
                Configuración Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gestiona limpieza automática, parámetros globales y mantenimiento.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/super-admin/fuentes">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-2 hover:border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Newspaper className="h-5 w-5 text-green-500" />
                Gestión de Fuentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Administra fuentes de noticias y ejecuta scraping manual.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/crear-noticiero">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-2 hover:border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mic className="h-5 w-5 text-blue-500" />
                Crear Noticiero
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Genera un noticiero con las noticias más recientes.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

// =====================================================
// ADMIN DASHBOARD - Vista del administrador (cliente)
// =====================================================
function AdminDashboard({ className }: DashboardProps) {
  const [period, setPeriod] = useState(7)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>({
    metrics: {
      totalNewsReports: 0,
      totalPeriodCost: 0,
      totalTokens: '0',
      mostActiveRadio: 'N/A',
      totalPeriodRevenue: 0
    },
    leaders: [],
    resources: {
      extractionTokens: 0,
      extractionCost: 0,
      curationTokens: 0,
      curationCost: 0,
      audioTokens: 0,
      audioCost: 0
    },
    advertising: []
  })

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/dashboard/stats?period=${period}`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Panel de Control</h1>
              <p className="text-muted-foreground">Vista general de tu cuenta y métricas.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TimeFilters value={period} onChange={setPeriod} />
          <Link href="/crear-noticiero">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Noticiero
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <MetricsCards metrics={data.metrics} />

      {/* Main Content Tabs - Sin consumo de IA (solo super_admin lo ve) */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="production">Producción</TabsTrigger>
          <TabsTrigger value="advertising">Publicidad</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Resumen de Actividad</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ProductionLeaders leaders={data.leaders} />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Distribución de Recursos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResourceBreakdown resources={data.resources} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="production" className="space-y-4">
          <ProductionLeaders leaders={data.leaders} />
        </TabsContent>

        <TabsContent value="advertising" className="space-y-4">
          <AdvertisingReport campaigns={data.advertising} />
        </TabsContent>
      </Tabs>

      {/* Quick Access for Admin */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/usuarios">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Mis Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gestiona los usuarios de tu cuenta.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/plantillas">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500" />
                Mis Plantillas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Crea y administra plantillas de noticieros.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/integraciones">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-500" />
                Integraciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Conecta con Google Drive, FTP, etc.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

// =====================================================
// USER DASHBOARD - Vista del sub-usuario
// =====================================================
function UserDashboard({ className }: DashboardProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido</h1>
          <p className="text-muted-foreground">Accede a tus herramientas de producción.</p>
        </div>
        <Link href="/crear-noticiero">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Crear Noticiero
          </Button>
        </Link>
      </div>

      {/* Accesos principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/crear-noticiero">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-2 hover:border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-blue-500" />
                Crear Noticiero
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Genera noticieros automáticos con voces de IA.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/timeline-noticiero">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-2 hover:border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-500" />
                Timeline Noticiero
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Edita y finaliza tus noticieros.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ultimo-minuto">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-2 hover:border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-red-500" />
                Último Minuto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Crea noticias urgentes rápidamente.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/bibliotecas">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-2 hover:border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-500" />
                Bibliotecas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Accede a voces, música y efectos de audio.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/activos">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-2 hover:border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-orange-500" />
                Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gestiona archivos y recursos multimedia.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/automatizacion">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full border-2 hover:border-indigo-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-indigo-500" />
                Automatización
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Programa noticieros automáticos.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tu Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/perfil">
            <Button variant="outline">
              Ver Mi Perfil
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}