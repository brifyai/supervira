/**
 * GEMINI 2.5 PRO PREVIEW TTS - TTS MODULE
 *
 * Este módulo proporciona funciones para usar Google Cloud Text-to-Speech API
 * con el modelo Gemini 2.5 Pro Preview TTS para generar audio desde texto.
 *
 * ⚠️ SERVER-ONLY: Este archivo NO puede ser importado por componentes cliente
 */

import "server-only";

import {
  GEMINI_CONFIG,
  getGeminiTTSUrl,
  validateGeminiConfig,
  calculateGeminiCost,
} from "./config";

/**
 * Interfaz para la solicitud de TTS a Google Cloud
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
 * Interfaz para la configuración de voz (formato Google Cloud TTS)
 */
interface GoogleVoiceConfig {
  languageCode: string;
  name: string;
  model_name: string;
}

/**
 * Interfaz para el input de TTS
 */
interface GoogleTTSInput {
  text?: string;
  prompt?: string;
}

/**
 * Interfaz para audio config
 */
interface GoogleAudioConfig {
  audioEncoding: string;
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
}

/**
 * Configuraciones de voz por defecto
 */
const DEFAULT_VOICE_SETTINGS = {
  pitch: 0,
  speed: 1.0,
  volume: 0,
};

/**
 * Mapeo de voces de Google Cloud TTS (Gemini 2.5 Pro Preview TTS)
 */
export const GEMINI_TTS_VOICES = {
  MALE_1: {
    id: "es-CL-male-1",
    name: "Carlos (Masculino - Profundo)",
    language: "es-CL",
    gender: "male",
    wpm: 160,
    avgPauseMs: 220,
    pitchRange: { min: -10, max: 10, default: 0 },
    speedRange: { min: 0.8, max: 1.2, default: 1.0 },
    googleVoiceName: "es-CL-Neural2-A", // Nombre real en Google Cloud
  },
  MALE_2: {
    id: "es-CL-male-2",
    name: "Miguel (Masculino - Estándar)",
    language: "es-CL",
    gender: "male",
    wpm: 175,
    avgPauseMs: 200,
    pitchRange: { min: -10, max: 10, default: 0 },
    speedRange: { min: 0.8, max: 1.2, default: 1.0 },
    googleVoiceName: "es-CL-Neural2-B", // Nombre real en Google Cloud
  },
  MALE_3: {
    id: "es-CL-male-3",
    name: "Felipe (Masculino - Juvenil)",
    language: "es-CL",
    gender: "male",
    wpm: 190,
    avgPauseMs: 180,
    pitchRange: { min: -5, max: 15, default: 5 },
    speedRange: { min: 0.9, max: 1.3, default: 1.05 },
    googleVoiceName: "es-CL-Neural2-C", // Nombre real en Google Cloud
  },
  FEMALE_1: {
    id: "es-CL-female-1",
    name: "Ana (Femenino - Suave)",
    language: "es-CL",
    gender: "female",
    wpm: 155,
    avgPauseMs: 250,
    pitchRange: { min: -5, max: 15, default: 0 },
    speedRange: { min: 0.75, max: 1.25, default: 1.0 },
    googleVoiceName: "es-CL-Neural2-D", // Nombre real en Google Cloud
  },
  FEMALE_2: {
    id: "es-CL-female-2",
    name: "Laura (Femenino - Estándar)",
    language: "es-CL",
    gender: "female",
    wpm: 165,
    avgPauseMs: 210,
    pitchRange: { min: -5, max: 15, default: 0 },
    speedRange: { min: 0.75, max: 1.25, default: 1.0 },
    googleVoiceName: "es-CL-Neural2-E", // Nombre real en Google Cloud
  },
  FEMALE_3: {
    id: "es-CL-female-3",
    name: "Camila (Femenino - Profesional)",
    language: "es-CL",
    gender: "female",
    wpm: 170,
    avgPauseMs: 200,
    pitchRange: { min: -10, max: 10, default: 0 },
    speedRange: { min: 0.85, max: 1.15, default: 1.0 },
    googleVoiceName: "es-CL-Neural2-F", // Nombre real en Google Cloud
  },
  DEFAULT: {
    id: "es-CL-default",
    name: "Predeterminado (Español Chileno)",
    language: "es-CL",
    gender: "neutral",
    wpm: 165,
    avgPauseMs: 200,
    pitchRange: { min: -10, max: 10, default: 0 },
    speedRange: { min: 0.75, max: 1.25, default: 1.0 },
    googleVoiceName: "es-CL-Neural2-B", // Usar voz masculina estándar por defecto
  },
};

/**
 * Función principal para generar audio con Google Cloud Text-to-Speech API
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
      voice = "es-CL-male-2",
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

    // Obtener la configuración de la voz
    const voiceConfig =
      Object.values(GEMINI_TTS_VOICES).find((v) => v.id === voice) ||
      GEMINI_TTS_VOICES.DEFAULT;

    const modelName = "gemini-2.5-pro-preview-tts";
    const endpoint = getGeminiTTSUrl();

    console.log(
      `🔄 Generando audio con Gemini 2.5 Pro Preview TTS (${text.length} caracteres)...`,
    );
    console.log(
      `🗣️ Voz: ${voiceConfig.name} (${voiceConfig.googleVoiceName}), Velocidad: ${speed}, Tono: ${pitch}, Volumen: ${volume}`,
    );

    // Construir el payload para Google Cloud TTS API
    const payload = {
      input: {
        text: text,
      },
      voice: {
        languageCode: language,
        name: voiceConfig.googleVoiceName,
        model_name: modelName,
      } as GoogleVoiceConfig,
      audioConfig: {
        audioEncoding: "LINEAR16",
        speakingRate: speed,
        pitch: pitch,
        volumeGainDb: volume,
      } as GoogleAudioConfig,
    };

    console.log(
      "[DEBUG] Payload enviado a Google Cloud TTS:",
      JSON.stringify(payload, null, 2),
    );

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GEMINI_CONFIG.apiKey}`,
        "x-goog-user-project": process.env.GOOGLE_PROJECT_ID || "",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Error Google Cloud TTS API (${response.status}):`,
        errorText,
      );

      return {
        success: false,
        error: `Error en Google Cloud TTS API: ${response.status} - ${errorText}`,
        voice,
      };
    }

    const data = await response.json();

    // Extraer el audio de la respuesta (formato Google Cloud TTS)
    let audioData: string;
    let duration: number | undefined;

    if (data.audioContent) {
      // Audio en formato base64 (LINEAR16)
      audioData = data.audioContent;
    } else {
      console.error("❌ Google Cloud TTS API no devolvió audio");
      return {
        success: false,
        error: "Google Cloud TTS API no devolvió audio",
        voice,
      };
    }

    // Convertir a Buffer
    const audioBuffer = Buffer.from(audioData, "base64");

    // Calcular tokens y costo
    const tokensUsed = Math.ceil(text.length / 4); // Estimación
    const cost = calculateGeminiCost(tokensUsed, "tts");

    // Estimar duración para LINEAR16 (16kHz)
    // Para LINEAR16: 1 segundo = 32000 bytes (16 bits * 2 canales * 16000 Hz / 8)
    const bytesPerSecond = 32000;
    duration = audioBuffer.length / bytesPerSecond;

    console.log(
      `✅ Audio generado exitosamente (${duration.toFixed(2)}s, ${tokensUsed} tokens, $${cost.toFixed(6)})`,
    );

    return {
      success: true,
      audioBuffer,
      audioData,
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
 * Genera audio para una noticia humanizada
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
    voice = "es-CL-male-2",
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
    voiceId in GEMINI_TTS_VOICES || voiceId === GEMINI_TTS_VOICES.DEFAULT.id
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
