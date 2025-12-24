/**
 * GEMINI 2.5 PRO PREVIEW TTS - TTS MODULE
 *
 * Este módulo proporciona funciones para usar Gemini 2.5 Pro Preview TTS para generar
 * audio desde texto (Text-to-Speech), reemplazando la funcionalidad de VoiceMaker.
 *
 * ⚠️ SERVER-ONLY: Este archivo NO puede ser importado por componentes cliente
 */

import "server-only";

import {
  GEMINI_CONFIG,
  getGeminiUrl,
  getGeminiHeaders,
  validateGeminiConfig,
  calculateGeminiCost,
} from "./config";

/**
 * Interfaz para la solicitud de TTS a Gemini
 */
interface GeminiTTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  language?: string;
}

/**
 * Interfaz para la respuesta de TTS
 */
interface GeminiTTSResponse {
  success: boolean;
  audioBuffer?: Buffer;
  audioData?: string; // base64
  duration?: number;
  tokens?: number;
  cost?: number;
  error?: string;
  voice?: string;
}

/**
 * Interfaz para la configuración de voz
 */
interface VoiceSettings {
  pitch: number; // -20 a 20
  speed: number; // 0.25 a 4.0
  volume: number; // -96.0 a 16.0 dB
  sampleRate: number; // Hz
}

/**
 * Configuraciones de voz por defecto
 */
const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  pitch: 0,
  speed: 1.0,
  volume: 0,
  sampleRate: 24000,
};

/**
 * Mapeo de voces de Gemini
 */
export const GEMINI_TTS_VOICES = {
  MALE_1: {
    id: "es-CL-male-1",
    name: "Carlos (Masculino - Profundo)",
    language: "es-CL",
    gender: "male",
    pitchRange: { min: -10, max: 10, default: 0 },
    speedRange: { min: 0.8, max: 1.2, default: 1.0 },
  },
  MALE_2: {
    id: "es-CL-male-2",
    name: "Miguel (Masculino - Estándar)",
    language: "es-CL",
    gender: "male",
    pitchRange: { min: -10, max: 10, default: 0 },
    speedRange: { min: 0.8, max: 1.2, default: 1.0 },
  },
  FEMALE_1: {
    id: "es-CL-female-1",
    name: "Ana (Femenino - Suave)",
    language: "es-CL",
    gender: "female",
    pitchRange: { min: -5, max: 15, default: 0 },
    speedRange: { min: 0.75, max: 1.25, default: 1.0 },
  },
  FEMALE_2: {
    id: "es-CL-female-2",
    name: "Laura (Femenino - Estándar)",
    language: "es-CL",
    gender: "female",
    pitchRange: { min: -5, max: 15, default: 0 },
    speedRange: { min: 0.75, max: 1.25, default: 1.0 },
  },
  DEFAULT: {
    id: "es-CL-default",
    name: "Predeterminado (Español Chileno)",
    language: "es-CL",
    gender: "neutral",
    pitchRange: { min: -10, max: 10, default: 0 },
    speedRange: { min: 0.75, max: 1.25, default: 1.0 },
  },
};

/**
 * Función principal para generar audio con Gemini 2.5 Pro Preview TTS
 */
export async function generateAudioWithGemini(
  request: GeminiTTSRequest,
): Promise<GeminiTTSResponse> {
  try {
    // Validar configuración
    if (!validateGeminiConfig()) {
      return {
        success: false,
        error: "GEMINI API key no configurada",
      };
    }

    const {
      text,
      voice = "es-CL-default",
      speed = DEFAULT_VOICE_SETTINGS.speed,
      pitch = DEFAULT_VOICE_SETTINGS.pitch,
      volume = DEFAULT_VOICE_SETTINGS.volume,
      language = "es-CL",
    } = request;

    // Validar texto
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: "El texto no puede estar vacío",
      };
    }

    const model = GEMINI_CONFIG.models.tts;
    const endpoint = getGeminiUrl(GEMINI_CONFIG.endpoints.textToSpeech(model));

    console.log(
      `🔄 Generando audio con Gemini 2.5 Pro Preview TTS para texto (${text.length} caracteres)...`,
    );
    console.log(
      `🗣️ Voz: ${voice}, Velocidad: ${speed}, Tono: ${pitch}, Volumen: ${volume}`,
    );

    // Construir el payload para la API de Gemini
    // Nota: Gemini 2.5 Pro Preview TTS usa generateContent para generar audio
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Genera el audio en español chileno del siguiente texto de noticia: "${text}"`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
        responseMimeType: "audio/mpeg", // Solicitar audio directamente
        responseModalities: ["AUDIO"],
      },
      voiceSettings: {
        pitch: pitch,
        speed: speed,
        volume: volume,
        languageCode: language,
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: getGeminiHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error Gemini TTS API (${response.status}):`, errorText);

      return {
        success: false,
        error: `Error en Gemini TTS API: ${response.status} - ${errorText}`,
        voice,
      };
    }

    const data = await response.json();

    // Extraer el audio de la respuesta
    // Gemini 2.5 Pro Preview TTS puede devolver audio en diferentes formatos
    let audioData: string | Buffer;
    let duration: number | undefined;

    if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
      // Audio en formato base64 inline
      const inlineData = data.candidates[0].content.parts[0].inlineData;
      audioData = inlineData.data;
      duration = inlineData.durationMs
        ? inlineData.durationMs / 1000
        : undefined;
    } else if (data.candidates?.[0]?.content?.parts?.[0]?.audio) {
      // Audio directo
      audioData = data.candidates[0].content.parts[0].audio;
    } else if (data.audio) {
      // Audio en nivel superior
      audioData = data.audio;
    } else {
      console.error("❌ Gemini TTS API no devolvió audio");
      return {
        success: false,
        error: "Gemini TTS API no devolvió audio",
        voice,
      };
    }

    // Convertir a Buffer si es base64
    const audioBuffer =
      typeof audioData === "string"
        ? Buffer.from(audioData, "base64")
        : audioData;

    // Calcular tokens y costo
    const tokensUsed = Math.ceil(text.length / 4); // Estimación
    const cost = calculateGeminiCost(tokensUsed, "tts");

    // Estimar duración si no se proporcionó
    if (!duration) {
      // Estimación basada en velocidad y longitud de texto
      const wordsPerSecond = 2.7 * speed; // ~160 WPM base = 2.7 palabras/segundo
      const words = text.split(/\s+/).length;
      duration = words / wordsPerSecond;
    }

    console.log(
      `✅ Audio generado exitosamente (${duration?.toFixed(2)}s, ${tokensUsed} tokens, $${cost?.toFixed(6)})`,
    );

    return {
      success: true,
      audioBuffer,
      audioData: typeof audioData === "string" ? audioData : undefined,
      duration,
      tokens: tokensUsed,
      cost,
      voice,
    };
  } catch (error) {
    console.error("❌ Error en generateAudioWithGemini:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
      voice: request.voice || "unknown",
    };
  }
}

/**
 * Genera audio para una noticia humanizada usando Gemini 2.5 Pro Preview TTS
 */
export async function generateNewsAudio(
  text: string,
  options?: {
    voice?: string;
    speed?: number;
    pitch?: number;
    volume?: number;
    urgency?: "low" | "medium" | "high";
  },
): Promise<GeminiTTSResponse> {
  const {
    voice = "es-CL-default",
    speed = DEFAULT_VOICE_SETTINGS.speed,
    pitch = DEFAULT_VOICE_SETTINGS.pitch,
    volume = DEFAULT_VOICE_SETTINGS.volume,
    urgency = "medium",
  } = options || {};

  // Ajustar velocidad según urgencia
  let adjustedSpeed = speed;
  switch (urgency) {
    case "low":
      adjustedSpeed = speed * 0.9; // Más lento para noticias calmas
      break;
    case "high":
      adjustedSpeed = speed * 1.15; // Más rápido para urgentes
      break;
    default:
    // mantener velocidad normal
  }

  return generateAudioWithGemini({
    text,
    voice,
    speed: adjustedSpeed,
    pitch,
    volume,
  });
}

/**
 * Genera múltiples audios en batch
 */
export async function generateBatchAudio(
  texts: string[],
  options?: GeminiTTSRequest,
): Promise<GeminiTTSResponse[]> {
  const results: GeminiTTSResponse[] = [];

  console.log(`🔄 Generando ${texts.length} audios en batch...`);

  for (let i = 0; i < texts.length; i++) {
    console.log(`📝 Procesando audio ${i + 1}/${texts.length}...`);

    const result = await generateAudioWithGemini({
      ...options,
      text: texts[i],
    });

    results.push(result);

    // Pequeña pausa para no saturar la API
    if (i < texts.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  const successful = results.filter((r) => r.success).length;
  console.log(
    `✅ Batch completado: ${successful}/${texts.length} audios generados exitosamente`,
  );

  return results;
}

/**
 * Obtiene información sobre las voces disponibles
 */
export function getAvailableVoices() {
  return Object.values(GEMINI_TTS_VOICES).map((voice) => ({
    id: voice.id,
    name: voice.name,
    language: voice.language,
    gender: voice.gender,
    pitchRange: voice.pitchRange,
    speedRange: voice.speedRange,
  }));
}

/**
 * Valida si una voz es válida
 */
export function isValidVoice(voiceId: string): boolean {
  return (
    voiceId in GEMINI_TTS_VOICES || voiceId === GEMINI_CONFIG.voices.default
  );
}

/**
 * Calcula la duración estimada de un texto
 */
export function estimateTextDuration(
  text: string,
  speed: number = DEFAULT_VOICE_SETTINGS.speed,
): number {
  const words = text.split(/\s+/).length;
  const wordsPerSecond = 2.7 * speed; // ~160 WPM base
  return words / wordsPerSecond;
}

/**
 * Normaliza las configuraciones de voz
 */
export function normalizeVoiceSettings(
  settings: Partial<VoiceSettings>,
): VoiceSettings {
  return {
    pitch: Math.max(
      -20,
      Math.min(20, settings.pitch ?? DEFAULT_VOICE_SETTINGS.pitch),
    ),
    speed: Math.max(
      0.25,
      Math.min(4.0, settings.speed ?? DEFAULT_VOICE_SETTINGS.speed),
    ),
    volume: Math.max(
      -96,
      Math.min(16, settings.volume ?? DEFAULT_VOICE_SETTINGS.volume),
    ),
    sampleRate: settings.sampleRate ?? DEFAULT_VOICE_SETTINGS.sampleRate,
  };
}

// Exportar todas las funciones
export default {
  generateAudioWithGemini,
  generateNewsAudio,
  generateBatchAudio,
  getAvailableVoices,
  isValidVoice,
  estimateTextDuration,
  normalizeVoiceSettings,
  GEMINI_TTS_VOICES,
};
