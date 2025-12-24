/**
 * CONFIGURACIÓN CENTRALIZADA DE GEMINI 2.5 FLASH
 *
 * Este archivo centraliza toda la configuración relacionada con Gemini 2.5 Flash
 * para facilitar el mantenimiento y evitar duplicación de código.
 *
 * ⚠️ SERVER-ONLY: Este archivo NO puede ser importado por componentes cliente
 */

// SECURITY: Prevent client-side import
import "server-only";

// Configuración de Gemini 2.5 Flash desde variables de entorno (server-only)
export const GEMINI_CONFIG = {
  // API Key - MUST be server-only for security
  apiKey:
    process.env.GOOGLE_GEMINI_API_KEY ||
    "AIzaSyC9Ut0-HNNkm2Bz3L5qGGz4uWZXvJEs1pM",

  // Base URL para API de Gemini
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",

  // Base URL para API de Google Cloud Text-to-Speech
  ttsBaseUrl: "https://texttospeech.googleapis.com/v1",

  // Modelos disponibles
  models: {
    chat: "gemini-2.0-flash-exp", // Modelo para reescribir noticias
    tts: "gemini-2.5-pro-preview-tts", // Modelo para generar audio
  },

  // Endpoints
  endpoints: {
    chatCompletions: (model: string) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    textToSpeech: "text:synthesize", // Endpoint específico de Google Cloud TTS
  },

  // Configuraciones por defecto para diferentes tipos de peticiones
  defaultOptions: {
    chatCompletions: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      topK: 40,
      topP: 0.95,
    },
    textToSpeech: {
      voiceSettings: {
        pitch: 0,
        speed: 1.0,
        volume: 0,
      },
    },
  },

  // Configuración de voces para Gemini TTS
  voices: {
    default: "es-CL", // Español chileno por defecto
    available: ["es-CL", "es-ES", "es-MX"], // Voces disponibles
  },
};

// Función para obtener headers comunes para peticiones a Gemini
export const getGeminiHeaders = (contentType: string = "application/json") => {
  return {
    "Content-Type": contentType,
    // API key se pasa como parámetro en la URL, no en headers
  };
};

// Función para construir la URL con API key (para chat)
export const getGeminiUrl = (endpoint: string): string => {
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}key=${GEMINI_CONFIG.apiKey}`;
};

// Función para construir la URL de TTS (usa Authorization header)
export const getGeminiTTSUrl = (): string => {
  return `${GEMINI_CONFIG.ttsBaseUrl}/${GEMINI_CONFIG.endpoints.textToSpeech}`;
};

// Función para validar que la configuración está completa
export const validateGeminiConfig = (): boolean => {
  return GEMINI_CONFIG.apiKey && GEMINI_CONFIG.apiKey.trim() !== "";
};

// Función para obtener mensaje de error de configuración
export const getGeminiConfigError = (): string => {
  if (!GEMINI_CONFIG.apiKey) {
    return "Falta la variable de entorno GOOGLE_GEMINI_API_KEY";
  }
  return "";
};

// Función para calcular costos de Gemini (basado en precios estimados)
export const calculateGeminiCost = (
  tokens: number,
  operation: "chat" | "tts",
): number => {
  // Precios estimados por 1M tokens (ejemplo, ajustar según precios reales)
  const prices = {
    chat: 0.0001, // $0.10 por 1M tokens
    tts: 0.0002, // $0.20 por 1M tokens
  };

  return (tokens / 1_000_000) * prices[operation];
};

// Exportar configuración por defecto para compatibilidad
export default GEMINI_CONFIG;
