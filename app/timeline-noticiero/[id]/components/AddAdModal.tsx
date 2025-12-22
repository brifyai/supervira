import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase'
import { Loader2, Megaphone } from 'lucide-react'
interface AddAdModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onAddAd: (ad: any) => void
}

export function AddAdModal({ open, onOpenChange, onAddAd }: AddAdModalProps) {
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            loadCampaigns()
        }
    }, [open])

    const loadCampaigns = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/campaigns')
            if (!response.ok) throw new Error('Error al cargar campañas')

            const data = await response.json()
            // Filtrar solo activas si la API devuelve todas (la API ya filtra por usuario)
            const activeCampaigns = data.filter((c: any) => c.esta_activo)
            setCampaigns(activeCampaigns || [])
        } catch (error) {
            console.error('Error loading campaigns:', error)
            toast.error('Error al cargar campañas')
        } finally {
            setLoading(false)
        }
    }

    const handleConfirm = () => {
        if (!selectedId) return
        const campaign = campaigns.find(c => c.id === selectedId)
        if (campaign) {
            onAddAd({
                id: `ad-${Date.now()}`,
                title: campaign.nombre,
                content: campaign.descripcion || 'Anuncio publicitario',
                audioUrl: campaign.url_audio || null,
                type: 'ad',
                duration: campaign.duracion_segundos || 30,
                campaignId: campaign.id
            })
            onOpenChange(false)
            setSelectedId(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Insertar Publicidad</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">
                            No tienes campañas activas.
                        </div>
                    ) : (
                        <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-2">
                                {campaigns.map((campaign) => (
                                    <div
                                        key={campaign.id}
                                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedId === campaign.id
                                            ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500'
                                            : 'hover:bg-gray-50 border-gray-200'
                                            }`}
                                        onClick={() => setSelectedId(campaign.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                                <Megaphone className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-900">{campaign.nombre}</h4>
                                                <p className="text-sm text-gray-500 line-clamp-1">
                                                    {campaign.url_audio ? '🔊 Audio disponible' : campaign.descripcion || 'Sin descripción'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedId}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        Insertar Anuncio
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
