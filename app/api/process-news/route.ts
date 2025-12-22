
import { fetchWithRetry } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'
import { logTokenUsage, calculateAbacusAICost, calculateGroqCost, calculateChutesAICost } from '@/lib/usage-logger'
import { CHUTES_CONFIG, getChutesHeaders } from '@/lib/chutes-config'

// Configuración directa de Google Gemini 2.5 Flash
const GEMINI_CONFIG = {
  apiKey: process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
  model: 'gemini-2.0-flash-exp',
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'
}

// Función para obtener headers de Gemini
const getGeminiHeaders = () => ({
  'Content-Type': 'application/json'
})

export async function POST(request: NextRequest) {
  try {
    const { content, step, radioStyle, provider = 'chutes', model = 'gpt-4.1-mini', groqApiKey, userId } = await request.json()

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (provider === 'groq' && !groqApiKey) {
      return NextResponse.json({ error: 'Groq API Key is required' }, { status: 400 })
    }

    // Reglas TTS comunes para todos los pasos
    const reglasParaTTS = `
REGLAS PARA TTS (texto a voz) CON ESPAÑOL PERFECTO:
- Convierte horas a lenguaje natural: "8 AM" → "ocho de la mañana", "3 PM" → "tres de la tarde"
- Escribe números pequeños en palabras: "3 personas" → "tres personas"
- No uses símbolos: % → "por ciento", $ → "pesos", & → "y"
- Evita: @, #, *, /, comillas, paréntesis, punto y coma
- Solo usa comas y puntos para pausas
- Siglas poco conocidas: deletréalas o explícalas
- URLs: solo menciona el nombre del sitio

🎯 REGLA CRÍTICA: PRESERVAR ESPAÑOL PERFECTO
- **MANTENER TODOS LOS ACENTOS Y TILDES**: México, Perú, Argentina, construcción, información, público, miércoles, año, también, además, política, económico, técnico, básico, análisis
- **PRESERVAR LA Ñ**: niño, camión, mañana, año, muñeca, cañón, ñandú
- **ACENTOS EN VOCALES TÓNICAS**: sé, dé, mí, tú, él, qué, quién, cómo, dónde, cuándo, porqué
- **VERBOS IRREGULARES**: dijéramos, fuéramos, tuviéramos, hubiéramos, dijésemos
- **NUNCA OMITIR ACENTOS**: México (no Mexico), Perú (no Peru), año (no ano), además (no ademas), también (no tambien)`

    // Configurar el prompt según el paso
    let systemPrompt = ''
    let userPrompt = ''

    switch (step) {
      case 'rewrite':
        systemPrompt = 'Eres un periodista experto en reescribir noticias para radio en Chile. El texto será leído por un sistema TTS, así que debe ser fácil de pronunciar con español chileno perfecto.'
        userPrompt = `Reescribe la siguiente noticia para radio manteniendo todos los hechos importantes pero adaptando el lenguaje para ser más dinámico y apropiado para transmisión radial.

${reglasParaTTS}

🎯 IMPORTANTE: El texto debe estar listo para ser leído por TTS con pronunciación perfecta en español chileno.

Noticia:
${content}`
        break
      case 'humanize':
        systemPrompt = 'Eres un locutor de radio profesional chileno. Tu trabajo es humanizar noticias para que suenen naturales al ser leídas por un sistema TTS, preservando todos los acentos, tildes y ñ.'
        userPrompt = `Humaniza esta noticia para que suene como si un locutor de radio chileno la estuviera contando de manera natural y conversacional.

${reglasParaTTS}

🎯 IMPORTANTE: Preserva todos los acentos, tildes y ñ para perfecta pronunciación en español chileno.

Noticia:
${content}`
        break
      case 'adapt':
        systemPrompt = 'Adapta el tono y estilo de las noticias según la identidad de la radio. El texto será leído por TTS con español chileno perfecto.'
        userPrompt = `Adapta esta noticia al estilo ${radioStyle || 'profesional y objetivo'}. Mantén los hechos pero ajusta el tono y enfoque.

${reglasParaTTS}

🎯 IMPORTANTE: El resultado debe tener español chileno perfecto con todos los acentos, tildes y ñ para TTS.

Noticia:
${content}`
        break
      default:
        return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }

    // Configurar la API según el proveedor
    let apiUrl = ''
    let headers = {}
    let body = {}

    if (provider === 'chutes' || provider === 'gemini') {
      apiUrl = `${GEMINI_CONFIG.endpoint}?key=${GEMINI_CONFIG.apiKey}`
      headers = getGeminiHeaders()
      body = {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userPrompt}`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.7
        }
      }
    } else if (provider === 'abacus') {
      apiUrl = 'https://apps.abacus.ai/v1/chat/completions'
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      }
      body = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }
    } else if (provider === 'groq') {
      apiUrl = 'https://api.groq.com/openai/v1/chat/completions'
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      }
      body = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }
    }



    // ... (existing imports)

    // Llamar a la API seleccionada
    const response = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }, {
      retries: 2,
      backoff: 1000,
      onRetry: (attempt) => console.log(`🔄 Reintentando ${provider} (Intento ${attempt})...`)
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const processedContent = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!processedContent) {
      throw new Error('No content generated')
    }

    // Registrar uso de tokens
    if (data.usage) {
      const tokensUsed = data.usage.total_tokens || 0
      let cost = 0

      if (provider === 'chutes' || provider === 'gemini') {
        cost = calculateChutesAICost(tokensUsed)
      } else if (provider === 'groq') {
        cost = calculateGroqCost(tokensUsed)
      } else {
        cost = calculateAbacusAICost(tokensUsed, model)
      }

      await logTokenUsage({
        user_id: userId,
        servicio: provider === 'chutes' || provider === 'gemini' ? 'gemini' : (provider === 'groq' ? 'groq' : 'abacus'),
        operacion: 'procesamiento_texto',
        tokens_usados: tokensUsed,
        costo: cost,
        metadata: {
          model: provider === 'chutes' || provider === 'gemini' ? GEMINI_CONFIG.model : model,
          step,
          radioStyle,
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0
        }
      })
    }

    return NextResponse.json({
      success: true,
      originalContent: content,
      processedContent: processedContent.trim(),
      step,
      radioStyle,
      provider,
      model: provider === 'chutes' || provider === 'gemini' ? GEMINI_CONFIG.model : model,
      tokensUsed: data.usage?.total_tokens || 0
    })

  } catch (error) {
    console.error('Error processing news:', error)
    return NextResponse.json(
      { error: 'Error processing news with AI' },
      { status: 500 }
    )
  }
}
