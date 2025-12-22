'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Navigation } from '@/components/navigation'
import { ProtectedRoute } from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { toast } from 'react-toastify'
import { UserPlus, Users, Shield, Crown, User, Loader2, RefreshCw, Key, Copy } from 'lucide-react'

interface UserData {
    id: string
    nombre_completo: string
    email: string
    role: string
    company: string
    is_active: boolean
    created_at: string
    last_login: string | null
}

export default function UsuariosPage() {
    const [users, setUsers] = useState<UserData[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)

    // Form state
    const [newName, setNewName] = useState('')
    const [newEmail, setNewEmail] = useState('')
    const [newPassword, setNewPassword] = useState('')

    // Generar contraseña aleatoria
    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
        let password = ''
        for (let i = 0; i < 10; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setNewPassword(password)
    }

    // Copiar al portapapeles
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Contraseña copiada al portapapeles')
    }

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/users')
            const data = await response.json()

            if (response.ok) {
                // La API envuelve la respuesta en { success, data: { users }, timestamp }
                setUsers(data.data?.users || [])
            } else {
                toast.error(data.error || 'Error al cargar usuarios')
            }
        } catch (error) {
            console.error('Error fetching users:', error)
            toast.error('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleCreateUser = async () => {
        if (!newName || !newEmail || !newPassword) {
            toast.error('Completa todos los campos incluyendo la contraseña')
            return
        }

        if (newPassword.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres')
            return
        }

        setCreating(true)
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    email: newEmail,
                    password: newPassword,
                    role: 'user' // Siempre se crea como usuario dependiente
                })
            })

            const data = await response.json()

            if (response.ok) {
                toast.success(`Usuario creado exitosamente. Contraseña: ${newPassword}`, { autoClose: false })
                setDialogOpen(false)
                setNewName('')
                setNewEmail('')
                setNewPassword('')
                fetchUsers()
            } else {
                toast.error(data.error || 'Error al crear usuario')
            }
        } catch (error) {
            console.error('Error creating user:', error)
            toast.error('Error de conexión')
        } finally {
            setCreating(false)
        }
    }

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'super_admin':
                return <Badge className="bg-purple-600"><Crown className="w-3 h-3 mr-1" />Super Admin</Badge>
            case 'admin':
                return <Badge className="bg-blue-600"><Shield className="w-3 h-3 mr-1" />Admin</Badge>
            default:
                return <Badge variant="secondary"><User className="w-3 h-3 mr-1" />Usuario</Badge>
        }
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Nunca'
        return new Date(dateString).toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                <div className="container mx-auto py-8 px-4">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2">
                                <Users className="w-8 h-8" />
                                Gestión de Usuarios
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Administra los usuarios de tu cuenta
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={fetchUsers} disabled={loading}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Actualizar
                            </Button>

                            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Nuevo Usuario
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                                        <DialogDescription>
                                            El usuario recibirá un email con instrucciones para acceder.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Nombre Completo</Label>
                                            <Input
                                                id="name"
                                                placeholder="Juan Pérez"
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="juan@ejemplo.com"
                                                value={newEmail}
                                                onChange={(e) => setNewEmail(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Rol</Label>
                                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
                                                <User className="w-4 h-4 text-gray-500" />
                                                <span className="text-sm text-gray-700">Usuario</span>
                                                <span className="text-xs text-muted-foreground">(dependerá de tu cuenta)</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password">Contraseña *</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="password"
                                                    type="text"
                                                    placeholder="Contraseña del usuario"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Button type="button" variant="outline" onClick={generatePassword} title="Generar contraseña">
                                                    <Key className="w-4 h-4" />
                                                </Button>
                                                {newPassword && (
                                                    <Button type="button" variant="outline" onClick={() => copyToClipboard(newPassword)} title="Copiar">
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">Mínimo 6 caracteres. Guarda esta contraseña para compartirla con el usuario.</p>
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                            Cancelar
                                        </Button>
                                        <Button onClick={handleCreateUser} disabled={creating}>
                                            {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            Crear Usuario
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Usuarios ({users.length})</CardTitle>
                            <CardDescription>
                                Lista de todos los usuarios registrados en el sistema
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center items-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : users.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No hay usuarios registrados</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Usuario</TableHead>
                                            <TableHead>Rol</TableHead>
                                            <TableHead>Empresa</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Último Acceso</TableHead>
                                            <TableHead>Creado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{user.nombre_completo || 'Sin nombre'}</p>
                                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getRoleBadge(user.role)}</TableCell>
                                                <TableCell>{user.company || 'VIRA'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={user.is_active ? 'default' : 'destructive'}>
                                                        {user.is_active ? 'Activo' : 'Inactivo'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {formatDate(user.last_login)}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {formatDate(user.created_at)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </ProtectedRoute>
    )
}

