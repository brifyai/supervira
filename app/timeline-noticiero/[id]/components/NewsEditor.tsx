'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Save, RotateCcw, Wand2, FileText, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useDebounce } from '@/hooks/use-debounce' // Asumimos que existe o lo crearemos

interface NewsVersions {
    original: string
    rewritten?: string
    humanized?: string
    custom?: string
}

interface NewsEditorProps {
    initialContent: string
    versions: NewsVersions
    activeVersion: keyof NewsVersions
    onSave: (content: string, version: keyof NewsVersions) => void
    onCancel: () => void
    isSaving?: boolean
}

export function NewsEditor({
    initialContent,
    versions,
    activeVersion: initialActiveVersion,
    onSave,
    onCancel,
    isSaving = false
}: NewsEditorProps) {
    const [activeTab, setActiveTab] = useState<string>(initialActiveVersion)
    const [content, setContent] = useState(initialContent)
    const [isDirty, setIsDirty] = useState(false)

    // Actualizar contenido al cambiar de tab
    const handleTabChange = (value: string) => {
        setActiveTab(value)
        const versionKey = value as keyof NewsVersions
        setContent(versions[versionKey] || '')
        setIsDirty(false)
    }

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value)
        setIsDirty(true)
    }

    const handleSave = () => {
        onSave(content, activeTab as keyof NewsVersions)
        setIsDirty(false)
    }

    return (
        <div className="bg-white border rounded-lg p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Editar Contenido</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                        className="gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="original" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Original
                    </TabsTrigger>
                    <TabsTrigger value="rewritten" className="gap-2" disabled={!versions.rewritten}>
                        <Wand2 className="h-4 w-4" />
                        Reescrito (IA)
                    </TabsTrigger>
                    <TabsTrigger value="humanized" className="gap-2" disabled={!versions.humanized}>
                        <User className="h-4 w-4" />
                        Humanizado
                    </TabsTrigger>
                </TabsList>

                <div className="mt-4 relative">
                    <Textarea
                        value={content}
                        onChange={handleContentChange}
                        className="min-h-[200px] font-mono text-sm resize-y p-4"
                        placeholder="Escribe el contenido de la noticia aquí..."
                    />
                    {isDirty && (
                        <Badge variant="secondary" className="absolute bottom-4 right-4 opacity-80">
                            Sin guardar
                        </Badge>
                    )}
                </div>

                <div className="text-xs text-gray-500 mt-2 flex justify-between items-center">
                    <span>
                        {content.length} caracteres | ~{Math.ceil(content.split(' ').length / 2.5)} segundos de lectura
                    </span>
                    {activeTab !== 'original' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={() => setContent(versions[activeTab as keyof NewsVersions] || '')}
                        >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restaurar versión
                        </Button>
                    )}
                </div>
            </Tabs>
        </div>
    )
}
