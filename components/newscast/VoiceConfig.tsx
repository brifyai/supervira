'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings2, Zap, Radio, Smile, Frown, Volume2, BookOpen } from 'lucide-react'

export interface VoiceConfigSettings {
  speed: number      // -50 a +50
  pitch: number      // -30 a +30
  volume: number     // -10 a +10 (dB)
  voiceStyle: 'alegre' | 'triste' | 'susurrar' | 'storyteller' | 'natural'  // ✅ NUEVO: Estilos de voz
}

interface VoiceConfigProps {
  settings: VoiceConfigSettings
  onChange: (settings: VoiceConfigSettings) => void
  disabled?: boolean
}

export function VoiceConfig({ settings, onChange, disabled }: VoiceConfigProps) {
  const handleSpeedChange = (value: number[]) => {
    onChange({ ...settings, speed: value[0] })
  }

  const handlePitchChange = (value: number[]) => {
    onChange({ ...settings, pitch: value[0] })
  }

  const handleVolumeChange = (value: number[]) => {
    onChange({ ...settings, volume: value[0] })
  }

  const handleVoiceStyleChange = (style: 'alegre' | 'triste' | 'susurrar' | 'storyteller' | 'natural') => {
    onChange({ ...settings, voiceStyle: style })
  }

  const getStyleIcon = (style: string) => {
    switch (style) {
      case 'alegre': return <Smile className="h-4 w-4 text-yellow-500" />
      case 'triste': return <Frown className="h-4 w-4 text-blue-500" />
      case 'susurrar': return <Volume2 className="h-4 w-4 text-purple-500" />
      case 'storyteller': return <BookOpen className="h-4 w-4 text-green-500" />
      case 'natural': return <Radio className="h-4 w-4 text-gray-500" />
      default: return <Radio className="h-4 w-4 text-gray-500" />
    }
  }

  const getStyleLabel = (style: string) => {
    switch (style) {
      case 'alegre': return 'Alegre y enérgico'
      case 'triste': return 'Triste y melancólico'
      case 'susurrar': return 'Susurrado e íntimo'
      case 'storyteller': return 'Narrador de historias'
      case 'natural': return 'Natural y neutro'
      default: return 'Natural y neutro'
    }
  }

  return (
    <div className="space-y-6 p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Settings2 className="h-4 w-4" />
        Configuración de Voz
      </div>

      {/* Velocidad */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-yellow-500" />
            Velocidad
          </Label>
          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
            {settings.speed > 0 ? '+' : ''}{settings.speed}
          </span>
        </div>
        <Slider
          value={[settings.speed]}
          onValueChange={handleSpeedChange}
          min={-50}
          max={50}
          step={5}
          disabled={disabled}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>Más lento</span>
          <span>Normal</span>
          <span>Más rápido</span>
        </div>
      </div>

      {/* Tono */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Tono de Voz</Label>
          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
            {settings.pitch > 0 ? '+' : ''}{settings.pitch}
          </span>
        </div>
        <Slider
          value={[settings.pitch]}
          onValueChange={handlePitchChange}
          min={-20}
          max={20}
          step={1}
          disabled={disabled}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>Muy grave</span>
          <span>Grave</span>
          <span>Normal</span>
          <span>Agudo</span>
          <span>Muy agudo</span>
        </div>
      </div>

      {/* Volumen */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Volumen</Label>
          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
            {settings.volume > 0 ? '+' : ''}{settings.volume}dB
          </span>
        </div>
        <Slider
          value={[settings.volume]}
          onValueChange={handleVolumeChange}
          min={-10}
          max={10}
          step={1}
          disabled={disabled}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>Más bajo</span>
          <span>Normal</span>
          <span>Más alto</span>
        </div>
      </div>

      {/* Selector de Estilo de Voz (solo para Gemini TTS) */}
      <div className="space-y-3 pt-2 border-t">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm">
            {getStyleIcon(settings.voiceStyle)}
            Estilo de Voz
          </Label>
          <Select value={settings.voiceStyle} onValueChange={handleVoiceStyleChange} disabled={disabled}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar estilo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="natural">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-gray-500" />
                  <span>{getStyleLabel('natural')}</span>
                </div>
              </SelectItem>
              <SelectItem value="alegre">
                <div className="flex items-center gap-2">
                  <Smile className="h-4 w-4 text-yellow-500" />
                  <span>{getStyleLabel('alegre')}</span>
                </div>
              </SelectItem>
              <SelectItem value="triste">
                <div className="flex items-center gap-2">
                  <Frown className="h-4 w-4 text-blue-500" />
                  <span>{getStyleLabel('triste')}</span>
                </div>
              </SelectItem>
              <SelectItem value="susurrar">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-purple-500" />
                  <span>{getStyleLabel('susurrar')}</span>
                </div>
              </SelectItem>
              <SelectItem value="storyteller">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-green-500" />
                  <span>{getStyleLabel('storyteller')}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

    </div>
  )
}

// Default settings - Basados en recomendación de Google Gemini TTS
export const defaultVoiceConfig: VoiceConfigSettings = {
  speed: 0,       // Velocidad normal (sin ajuste)
  pitch: 0,       // Tono natural
  volume: 0,      // Volumen normal
  voiceStyle: 'natural'  // ✅ NUEVO: Estilo de voz por defecto
}
