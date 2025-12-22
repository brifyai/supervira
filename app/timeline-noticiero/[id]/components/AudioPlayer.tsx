'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AudioPlayerProps {
    src: string
    onPlay?: () => void
    onPause?: () => void
    onEnded?: () => void
    className?: string
}

/**
 * Transforma URLs de audio para que funcionen en producción
 * En producción, los archivos en /public creados después del build no son accesibles
 * directamente, así que los servimos via API route
 */
function getAudioUrl(originalUrl: string): string {
    // Si ya es una URL externa o de S3, dejar como está
    if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
        return originalUrl
    }

    // Si es una URL local de audio, usar la API route para servirla
    if (originalUrl.startsWith('/audio/') || originalUrl.startsWith('/generated-audio/')) {
        return `/api/audio?file=${encodeURIComponent(originalUrl)}`
    }

    // Otros casos: devolver original
    return originalUrl
}

export function AudioPlayer({ src, onPlay, onPause, onEnded, className = '' }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const [isMuted, setIsMuted] = useState(false)
    const [playbackRate, setPlaybackRate] = useState(1)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const updateTime = () => setCurrentTime(audio.currentTime)
        const updateDuration = () => setDuration(audio.duration)
        const handleEnded = () => {
            setIsPlaying(false)
            if (onEnded) onEnded()
        }

        audio.addEventListener('timeupdate', updateTime)
        audio.addEventListener('loadedmetadata', updateDuration)
        audio.addEventListener('ended', handleEnded)

        return () => {
            audio.removeEventListener('timeupdate', updateTime)
            audio.removeEventListener('loadedmetadata', updateDuration)
            audio.removeEventListener('ended', handleEnded)
        }
    }, [onEnded])

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause()
                if (onPause) onPause()
            } else {
                audioRef.current.play()
                if (onPlay) onPlay()
            }
            setIsPlaying(!isPlaying)
        }
    }

    const handleSeek = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.currentTime = value[0]
            setCurrentTime(value[0])
        }
    }

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted
            setIsMuted(!isMuted)
        }
    }

    const handleVolumeChange = (value: number[]) => {
        if (audioRef.current) {
            const newVolume = value[0]
            audioRef.current.volume = newVolume
            setVolume(newVolume)
            setIsMuted(newVolume === 0)
        }
    }

    const handleSpeedChange = (speed: number) => {
        if (audioRef.current) {
            audioRef.current.playbackRate = speed
            setPlaybackRate(speed)
        }
    }

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00'
        const minutes = Math.floor(time / 60)
        const seconds = Math.floor(time % 60)
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    return (
        <div className={`bg-white rounded-lg border p-3 shadow-sm ${className}`}>
            <audio ref={audioRef} src={getAudioUrl(src)} />

            <div className="flex items-center gap-3">
                {/* Play/Pause Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={togglePlay}
                >
                    {isPlaying ? (
                        <Pause className="h-5 w-5 text-blue-600" />
                    ) : (
                        <Play className="h-5 w-5 text-blue-600 ml-0.5" />
                    )}
                </Button>

                {/* Progress Bar */}
                <div className="flex-1 space-y-1">
                    <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={handleSeek}
                        className="cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Controls Group */}
                <div className="flex items-center gap-1">
                    {/* Volume Control */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700">
                                {isMuted || volume === 0 ? (
                                    <VolumeX className="h-4 w-4" />
                                ) : (
                                    <Volume2 className="h-4 w-4" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="top" className="p-3 min-w-[120px]">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs mb-1">
                                    <span>Volumen</span>
                                    <span>{Math.round(volume * 100)}%</span>
                                </div>
                                <Slider
                                    value={[isMuted ? 0 : volume]}
                                    max={1}
                                    step={0.1}
                                    onValueChange={handleVolumeChange}
                                />
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Speed Control */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700">
                                <span className="text-xs font-medium">{playbackRate}x</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="top" align="end">
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                                <DropdownMenuItem
                                    key={speed}
                                    onClick={() => handleSpeedChange(speed)}
                                    className="justify-between"
                                >
                                    <span>{speed}x</span>
                                    {playbackRate === speed && <Settings className="h-3 w-3 ml-2" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    )
}
