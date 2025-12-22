/**
 * CONFIGURACIÓN CENTRALIZADA DE CHUTES AI
 * 
 * Este archivo centraliza toda la configuración relacionada con Chutes AI
 * para facilitar el mantenimiento y evitar duplicación de código.
 * 
 * ⚠️ SERVER-ONLY: Este archivo NO puede ser importado por componentes cliente
 */

// SECURITY: Prevent client-side import
import 'server-only';

// Configuración de Chutes AI desde variables de entorno (server-only)
export const CHUTES_CONFIG = {
  // API Key - MUST be server-only for security
  apiKey: process.env.CHUTES_API_KEY || '',

  // Endpoints (URLs are not secrets, but config is cleaner here)
  endpoints: {
    chatCompletions: process.env.CHUTES_CHAT_COMPLETIONS_URL || 'https://llm.chutes.ai/v1/chat/completions',
    textToSpeech: process.env.CHUTES_TTS_URL || 'https://chutes-kokoro.chutes.ai/speak'
  },

  // Configuración del modelo y voz
  model: process.env.CHUTES_MODEL || 'openai/gpt-oss-120b',
  voice: process.env.CHUTES_VOICE || 'af_heart',

  // Configuraciones por defecto para diferentes tipos de peticiones
  defaultOptions: {
    chatCompletions: {
      model: process.env.CHUTES_MODEL || 'openai/gpt-oss-120b',
      stream: false,
      max_tokens: 1024,
      temperature: 0.7
    },
    textToSpeech: {
      voice: process.env.CHUTES_VOICE || 'af_heart'
    }
  }
};

// Función para obtener headers comunes para peticiones a Chutes AI
export const getChutesHeaders = (contentType: string = 'application/json') => {
  return {
    'Authorization': `Bearer ${CHUTES_CONFIG.apiKey}`,
    'Content-Type': contentType
  };
};

// Función para validar que la configuración está completa
export const validateChutesConfig = (): boolean => {
  const required = [
    CHUTES_CONFIG.apiKey,
    CHUTES_CONFIG.endpoints.chatCompletions,
    CHUTES_CONFIG.endpoints.textToSpeech,
    CHUTES_CONFIG.model,
    CHUTES_CONFIG.voice
  ];

  return required.every(value => value && value.trim() !== '');
};

// Función para obtener mensaje de error de configuración
export const getChutesConfigError = (): string => {
  const missing = [];

  if (!CHUTES_CONFIG.apiKey) missing.push('CHUTES_API_KEY');
  if (!CHUTES_CONFIG.endpoints.chatCompletions) missing.push('CHUTES_CHAT_COMPLETIONS_URL');
  if (!CHUTES_CONFIG.endpoints.textToSpeech) missing.push('CHUTES_TTS_URL');
  if (!CHUTES_CONFIG.model) missing.push('CHUTES_MODEL');
  if (!CHUTES_CONFIG.voice) missing.push('CHUTES_VOICE');

  return `Faltan las siguientes variables de entorno de Chutes AI: ${missing.join(', ')}`;
};

// Exportar configuración por defecto para compatibilidad
export default CHUTES_CONFIG;