import 'server-only';

import { TTSProvider, TTSRequest, TTSResponse } from './types';

// ============================================================================
// VOICEMAKER DEFAULT VOICES (Spanish) - Con WPM Calibrado
// ============================================================================
// WPM Calibrado: Medido empíricamente considerando MasterSpeed +15
// Fórmula: WPM_base * (1 + MasterSpeed/100) = WPM real
// Ej: 150 WPM * 1.15 = ~172 WPM efectivo
// ============================================================================
export const VOICEMAKER_VOICES = {
  // Voz masculina principal - Vicente tiende a ser ligeramente más rápido
  MALE_CL: {
    id: 'ai3-es-CL-Vicente',
    name: 'Vicente (Masculino)',
    engine: 'neural',
    language: 'es-CL',
    wpm: 201,  // Calibrado con datos reales (antes 175, estimaciones 17% muy largas)
    avgPauseMs: 200  // Pausa promedio entre frases
  },
  // Voz femenina principal - Eliana es ligeramente más pausada
  FEMALE_CL: {
    id: 'ai3-es-CL-Eliana',
    name: 'Eliana (Femenino)',
    engine: 'neural',
    language: 'es-CL',
    wpm: 195,  // Calibrado con datos reales (antes 168, estimaciones 17% muy largas)
    avgPauseMs: 250  // Pausa promedio entre frases
  },
  // Aliases para compatibilidad
  MALE_ES: {
    id: 'ai3-es-CL-Vicente',
    name: 'Vicente (Masculino)',
    engine: 'neural',
    language: 'es-CL',
    wpm: 201,
    avgPauseMs: 200
  },
  FEMALE_ES: {
    id: 'ai3-es-CL-Eliana',
    name: 'Eliana (Femenino)',
    engine: 'neural',
    language: 'es-CL',
    wpm: 195,
    avgPauseMs: 250
  }
};

// Helper para obtener WPM calibrado de una voz
export function getCalibratedWPM(voiceId: string): number {
  const voiceEntry = Object.values(VOICEMAKER_VOICES).find(v => v.id === voiceId);
  return voiceEntry?.wpm || 198;  // Default calibrado para VoiceMaker (datos reales)
}

// Constantes de timing para cálculos precisos
export const TIMING_CONSTANTS = {
  SILENCE_BETWEEN_NEWS: 1.5,     // Segundos de silencio entre noticias (audio-assembler)
  INTRO_DURATION: 12,            // Duración real medida (incluye pausas TTS)
  OUTRO_DURATION: 6,             // Duración estimada del outro (~15 palabras)
  AD_DURATION: 25,               // Duración promedio de publicidad
  CORTINA_DURATION: 5,           // Duración de cortina musical
  BUFFER_PERCENTAGE: 0.05        // 5% de buffer para variaciones
};

// ============================================================================
// 1. VOICEMAKER TTS PROVIDER (Cloud API)
// ============================================================================
export class VoiceMakerTTSProvider implements TTSProvider {
  private apiKey: string;
  private baseUrl = 'https://developer.voicemaker.in';
  public name = 'VoiceMaker';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.VOICEMAKER_API_KEY || '';
  }

  async synthesize(text: string, options?: any): Promise<TTSResponse> {
    try {
      console.log(`[VoiceMaker] Generando audio para: "${text.substring(0, 50)}..."`);

      // Determinar voz a usar
      const voiceId = options?.voiceId || options?.voice || VOICEMAKER_VOICES.MALE_CL.id;
      const languageCode = 'es-CL';  // Español chileno

      // Normalizar texto a UTF-8 para evitar problemas con Ñ, acentos, etc.
      const normalizedText = text
        .normalize('NFC')  // Normalización Unicode
        .replace(/\u00A0/g, ' ');  // Reemplazar espacios no-breaking

      console.log(`[VoiceMaker] Texto normalizado: "${normalizedText.substring(0, 50)}..."`);

      const requestBody: any = {
        Engine: options?.engine || 'neural',
        VoiceId: voiceId,
        LanguageCode: languageCode,
        Text: normalizedText,
        OutputFormat: 'mp3',
        SampleRate: '48000',
        MasterSpeed: String(options?.speed ?? 1),  // +1% velocidad (recomendación VoiceMaker)
        MasterPitch: String(options?.pitch ?? 0),   // Tono natural (antes -5)
        MasterVolume: String(options?.volume ?? 2), // +2dB volumen (default)
        Effect: options?.effect || 'news',          // Estilo noticiero
        ResponseType: 'file',  // Returns URL
        FileStore: 24  // Keep file for 24 hours
      };

      // Agregar VoxFX si está configurado (FM Radio effect)
      if (options?.voxFx) {
        requestBody.VoxFx = {
          presetId: options.voxFx.presetId,
          dryWet: options.voxFx.dryWet || 27,
          effects: options.voxFx.effects || []
        };
        console.log(`[VoiceMaker] 📻 VoxFX FM Radio activado: ${options.voxFx.dryWet}% intensidad`);
      }

      console.log(`[VoiceMaker] Using voice: ${voiceId}, language: ${languageCode}`);

      const response = await fetch(`${this.baseUrl}/api/v1/voice/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(120000) // 2 min timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`VoiceMaker API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`VoiceMaker Error: ${data.message || 'Unknown error'}`);
      }

      console.log(`[VoiceMaker] ✅ Audio generado: ${data.path}`);
      console.log(`[VoiceMaker] Caracteres usados: ${data.usedChars}, restantes: ${data.remainChars}`);

      // Descargar el audio para obtener el buffer
      const audioResponse = await fetch(data.path);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio from VoiceMaker`);
      }

      const audioArrayBuffer = await audioResponse.arrayBuffer();

      // Estimar duración basada en palabras (150 WPM promedio)
      const words = text.trim().split(/\s+/).length;
      const estimatedDuration = Math.max(3, Math.round((words / 150) * 60));

      return {
        audioData: audioArrayBuffer,
        audioUrl: data.path,  // VoiceMaker URL
        format: 'mp3',
        duration: estimatedDuration,
        cost: data.usedChars * 0.00001,  // Estimación de costo
        success: true,
        provider: 'voicemaker',
        voice: voiceId
      };

    } catch (error) {
      console.error('[VoiceMaker] Error:', error);
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('[VoiceMaker] API Key no configurada');
      return false;
    }

    try {
      // Intentar listar voces para verificar API key
      const response = await fetch(`${this.baseUrl}/api/v1/voice/list`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ language: 'es-ES' })
      });

      return response.ok;
    } catch (e) {
      console.error('[VoiceMaker] Error validando config:', e);
      return false;
    }
  }

  // Listar voces disponibles en español
  async listSpanishVoices(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/voice/list`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ language: 'es-ES' })
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.data?.voices_list || [];
    } catch (e) {
      console.error('[VoiceMaker] Error listando voces:', e);
      return [];
    }
  }
}

// ============================================================================
// 2. LOCAL TTS PROVIDER (Legacy - Ya no usado)
// ============================================================================
export class LocalTTSProvider implements TTSProvider {
  private baseUrl: string;
  public name: string = 'LocalTTS';

  constructor() {
    // URL del servidor Python local (SistemTTS)
    this.baseUrl = process.env.NEXT_PUBLIC_TTS_API_URL || 'http://127.0.0.1:5000';
  }

  async synthesize(text: string, options?: any): Promise<TTSResponse> {
    try {
      console.log(`[LocalTTS] Generando audio para: "${text.substring(0, 30)}..."`);

      // Determinar endpoint según si hay clonación de voz
      const voiceId = options?.voice || options?.voiceId;

      const endpoint = voiceId && voiceId.startsWith('http')
        ? '/tts_url'
        : '/tts';

      const payload: any = {
        text: text,
        language: 'es', // Forzar español para VIRA
        format: 'base64' // Solicitar respuesta en JSON con base64 y duración
      };

      if (endpoint === '/tts_url') {
        payload.audio_url = voiceId;
      } else if (voiceId) {
        // If it's a local file ID or default
        payload.voice = voiceId;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(300000) // 300s timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LocalTTS Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (!data.success || !data.audio_base64) {
        throw new Error(`LocalTTS Error: Respuesta inválida del servidor`);
      }

      // Decodificar base64 a ArrayBuffer (Node.js safe)
      const buffer = Buffer.from(data.audio_base64, 'base64');

      // Copiar a un nuevo ArrayBuffer para asegurar que sea independiente
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

      return {
        audioData: arrayBuffer,
        format: 'wav', // SistemTTS devuelve WAV
        duration: data.duration || 0, // Usar duración real calculada por el servidor
        cost: 0,
        success: true,
        provider: 'local',
        voice: voiceId
      };

    } catch (error) {
      console.error('[LocalTTS] Error:', error);
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (e) {
      return false;
    }
  }
}

// ============================================================================
// 2. CHUTES TTS PROVIDER (Fallback Cloud)
// ============================================================================
export class ChutesTTSProvider implements TTSProvider {
  private apiKey: string;
  public name: string = 'ChutesTTS';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async synthesize(text: string, options?: any): Promise<TTSResponse> {
    // Implementación básica de Chutes si fuera necesaria como backup
    // Por ahora placeholder para cumplir la interfaz
    throw new Error("Chutes TTS no implementado completamente aún. Usar LocalTTS.");
  }

  async validateConfig(): Promise<boolean> {
    return !!this.apiKey;
  }
}

// ============================================================================
// FACTORY
// ============================================================================
export class TTSProviderFactory {
  static getProvider(type: 'voicemaker' | 'local' | 'chutes' = 'voicemaker'): TTSProvider {
    // PRIORIDAD 1: VoiceMaker (Cloud API - Principal)
    if (type === 'voicemaker') {
      const apiKey = process.env.VOICEMAKER_API_KEY || '';
      if (apiKey) {
        return new VoiceMakerTTSProvider(apiKey);
      }
      console.warn('[TTSFactory] VoiceMaker API key no configurada');
    }

    // PRIORIDAD 2: Local TTS (Legacy - fallback)
    if (type === 'local') {
      return new LocalTTSProvider();
    }

    // PRIORIDAD 3: Chutes (si se solicita explícitamente)
    if (type === 'chutes') {
      const apiKey = process.env.CHUTES_API_KEY || '';
      return new ChutesTTSProvider(apiKey);
    }

    // Default: VoiceMaker si hay API key, sino Local
    const voicemakerKey = process.env.VOICEMAKER_API_KEY || '';
    if (voicemakerKey) {
      return new VoiceMakerTTSProvider(voicemakerKey);
    }

    return new LocalTTSProvider();
  }

  // Helper for route.ts compatibility - ahora usa VoiceMaker primero
  static getBestProvider(): TTSProvider {
    const voicemakerKey = process.env.VOICEMAKER_API_KEY || '';
    if (voicemakerKey) {
      return new VoiceMakerTTSProvider(voicemakerKey);
    }
    return new LocalTTSProvider();
  }

  static getAvailableProviders(): any[] {
    const providers = [];

    if (process.env.VOICEMAKER_API_KEY) {
      providers.push({
        name: 'VoiceMaker',
        isConfigured: () => true,
        estimateCost: (chars: number) => chars * 0.00001
      });
    }

    providers.push({ name: 'LocalTTS', isConfigured: () => true });

    return providers;
  }

  static getAllProviders(): any[] {
    return [
      { name: 'VoiceMaker' },
      { name: 'LocalTTS' },
      { name: 'ChutesTTS' }
    ];
  }
}

