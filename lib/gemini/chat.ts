/**
 * GEMINI 2.5 FLASH - CHAT MODULE
 *
 * Este módulo proporciona funciones para usar Gemini 2.5 Flash para reescribir
 * y generar contenido de noticias, reemplazando la funcionalidad de Chutes AI.
 *
 * ⚠️ SERVER-ONLY: Este archivo NO puede ser importado por componentes cliente
 */

import 'server-only';

import {
  GEMINI_CONFIG,
  getGeminiUrl,
  getGeminiHeaders,
  validateGeminiConfig
} from './config';

/**
 * Interfaz para la solicitud de chat a Gemini
 */
interface GeminiChatRequest {
  text: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Interfaz para la respuesta de Gemini
 */
interface GeminiChatResponse {
  success: boolean;
  text?: string;
  tokens?: number;
  error?: string;
  model?: string;
}

/**
 * Función principal para hacer peticiones de chat a Gemini 2.5 Flash
 */
export async function callGeminiChat(request: GeminiChatRequest): Promise<GeminiChatResponse> {
  try {
    // Validar configuración
    if (!validateGeminiConfig()) {
      return {
        success: false,
        error: 'GEMINI API key no configurada'
      };
    }

    const { text, systemPrompt, temperature, maxTokens } = request;
    const model = GEMINI_CONFIG.models.chat;
    const endpoint = getGeminiUrl(GEMINI_CONFIG.endpoints.chatCompletions(model));

    // Construir el payload para la API de Gemini
    const payload = {
      contents: [
        {
          parts: [
            { text: systemPrompt || '' },
            { text }
          ]
        }
      ],
      generationConfig: {
        temperature: temperature ?? GEMINI_CONFIG.defaultOptions.chatCompletions.temperature,
        maxOutputTokens: maxTokens ?? GEMINI_CONFIG.defaultOptions.chatCompletions.maxOutputTokens,
        topK: GEMINI_CONFIG.defaultOptions.chatCompletions.topK,
        topP: GEMINI_CONFIG.defaultOptions.chatCompletions.topP
      }
    };

    console.log(`🔄 Llamando a Gemini 2.5 Flash para procesar texto (${text.length} caracteres)...`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getGeminiHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error Gemini API (${response.status}):`, errorText);

      return {
        success: false,
        error: `Error en Gemini API: ${response.status} - ${errorText}`,
        model
      };
    }

    const data = await response.json();

    // Extraer el texto generado de la respuesta de Gemini
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!generatedText) {
      console.error('❌ Gemini API devolvió respuesta vacía');
      return {
        success: false,
        error: 'Gemini API devolvió respuesta vacía',
        model
      };
    }

    // Calcular tokens usados (estimación basada en longitud de texto)
    const tokensUsed = Math.ceil((text.length + generatedText.length) / 4);

    console.log(`✅ Texto generado exitosamente (${tokensUsed} tokens estimados)`);

    return {
      success: true,
      text: generatedText,
      tokens: tokensUsed,
      model
    };

  } catch (error) {
    console.error('❌ Error en callGeminiChat:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      model: GEMINI_CONFIG.models.chat
    };
  }
}

/**
 * Humaniza el texto de una noticia usando Gemini 2.5 Flash
 * Optimiza el texto para ser leído por TTS manteniendo un estilo de noticias de radio chileno
 */
export async function humanizeNewsText(
  originalText: string,
  context?: {
    region?: string;
    style?: 'formal' | 'casual' | 'dramatic';
  }
): Promise<GeminiChatResponse> {
  const { region = 'Chile', style = 'formal' } = context || {};

  const systemPrompt = `Eres un redactor de noticias de radio experto chileno. Tu objetivo es optimizar textos para ser leídos por sistemas TTS (Text-to-Speech).

REGLAS DE REDACCIÓN:
1. Usa oraciones cortas y claras (máximo 15 palabras por oración)
2. Elimina jerga técnica y abreviaturas complicadas
3. Incluye pausas naturales con signos de puntuación apropiados
4. Usa un tono ${style === 'formal' ? 'profesional y confiable' : style === 'casual' ? 'cercano y accesible' : 'intenso y emotivo'}
5. Menciona "${region}" cuando sea relevante para contextualizar
6. Evita números sueltos, escribe en palabras cuando sea posible
7. Usa un lenguaje claro y directo
8. Mantén la información esencial sin exagerar

Procesa el siguiente texto de noticia:`;

  return callGeminiChat({
    text: originalText,
    systemPrompt,
    temperature: 0.7,
    maxTokens: 1024
  });
}

/**
 * Ajusta el duración del texto para encajar en un tiempo específico
 */
export async function adjustTextDuration(
  text: string,
  targetDuration: number, // en segundos
  currentDuration?: number // duración actual estimada
): Promise<GeminiChatResponse> {
  let instruction = '';

  if (currentDuration) {
    if (currentDuration > targetDuration) {
      instruction = `Acorta el texto para que dure aproximadamente ${targetDuration} segundos. Elimina información secundaria pero mantén lo más importante.`;
    } else if (currentDuration < targetDuration) {
      instruction = `Extiende el texto para que dure aproximadamente ${targetDuration} segundos. Añade detalles relevantes sin inventar información.`;
    } else {
      return {
        success: true,
        text,
        tokens: Math.ceil(text.length / 4)
      };
    }
  } else {
    instruction = `Ajusta el texto para que dure aproximadamente ${targetDuration} segundos. Usa tu criterio para extender o acortar según sea necesario.`;
  }

  const systemPrompt = `Eres un experto editor de noticias para radio chilena. Optimizas textos para ser leídos por sistemas TTS manteniendo naturalidad y fluidez.

${instruction}

Velocidad promedio de habla: 160-170 palabras por minuto.

Procesa el siguiente texto:`;

  return callGeminiChat({
    text,
    systemPrompt,
    temperature: 0.6,
    maxTokens: 1024
  });
}

/**
 * Genera un cierre de noticiero extendido
 */
export async function generateNewscastClosing(
  newscastTitle: string,
  tone: 'professional' | 'casual' = 'professional'
): Promise<GeminiChatResponse> {
  const systemPrompt = `Eres un locutor de radio profesional chileno. Genera un cierre de noticiero "${newscastTitle}".

INSTRUCCIONES:
- Responde SOLO con el texto del cierre
- Usa un tono ${tone === 'professional' ? 'profesional y confiable' : 'cercano y amable'}
- Incluye un saludo final y agradecimiento a los oyentes
- Menciona el nombre del noticiero
- Máximo 3 oraciones
- Optimizado para TTS (frases cortas)`;

  return callGeminiChat({
    text: '',
    systemPrompt,
    temperature: 0.8,
    maxTokens: 512
  });
}

/**
 * Reescribe una noticia con un tono específico
 */
export async function rewriteNewsWithTone(
  originalText: string,
  tone: 'urgent' | 'neutral' | 'positive' | 'negative'
): Promise<GeminiChatResponse> {
  const toneInstructions = {
    urgent: 'Usa un tono urgente y de alerta. Usa palabras que transmitan inmediatez.',
    neutral: 'Usa un tono neutral y objetivo. Evita adjetivos calificativos.',
    positive: 'Usa un tono positivo y constructivo. Destra aspectos favorables.',
    negative: 'Usa un tono serio y preocupante. Destra aspectos negativos o riesgos.'
  };

  const systemPrompt = `Eres un redactor de noticias de radio chileno experto.

${toneInstructions[tone]}

Optimiza el texto para TTS. Usa oraciones cortas y lenguaje claro.

Procesa la siguiente noticia:`;

  return callGeminiChat({
    text: originalText,
    systemPrompt,
    temperature: 0.7,
    maxTokens: 1024
  });
}

/**
 * Resume una noticia manteniendo la información clave
 */
export async function summarizeNews(
  originalText: string,
  maxLength?: number // longitud máxima en caracteres
): Promise<GeminiChatResponse> {
  const lengthInstruction = maxLength
    ? `El resumen no debe exceder ${maxLength} caracteres.`
    : 'El resumen debe ser conciso pero completo.';

  const systemPrompt = `Eres un experto en resumen de noticias de radio chileno.

${lengthInstruction}
- Mantén la información más importante
- Usa oraciones claras y directas
- Optimiza para TTS (frases cortas)
- No omitas hechos clave

Procesa la siguiente noticia:`;

  return callGeminiChat({
    text: originalText,
    systemPrompt,
    temperature: 0.5,
    maxTokens: maxLength ? Math.ceil(maxLength / 2) : 512
  });
}

// Exportar todas las funciones
export default {
  callGeminiChat,
  humanizeNewsText,
  adjustTextDuration,
  generateNewscastClosing,
  rewriteNewsWithTone,
  summarizeNews
};
