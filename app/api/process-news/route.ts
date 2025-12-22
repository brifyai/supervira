
import { fetchWithRetry } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'
import { logTokenUsage, calculateAbacusAICost, calculateGroqCost, calculateChutesAICost } from '@/lib/usage-logger'
import { CHUTES_CONFIG, getChutesHeaders } from '@/lib/chutes-config'

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
REGLAS PARA TTS (texto a voz):
- Convierte horas a lenguaje natural: "8 AM" → "ocho de la mañana", "3 PM" → "tres de la tarde"
- Escribe números pequeños en palabras: "3 personas" → "tres personas"
- No uses símbolos: % → "por ciento", $ → "pesos", & → "y"
- Evita: @, #, *, /, comillas, paréntesis, punto y coma
- Solo usa comas y puntos para pausas
- Siglas poco conocidas: deletréalas o explícalas
- URLs: solo menciona el nombre del sitio`

    // Configurar el prompt según el paso
    let systemPrompt = ''
    let userPrompt = ''

    switch (step) {
      case 'rewrite':
        systemPrompt = 'Eres un periodista experto en reescribir noticias para radio en Chile. El texto será leído por un sistema TTS, así que debe ser fácil de pronunciar.'
        userPrompt = `Reescribe la siguiente noticia para radio manteniendo todos los hechos importantes pero adaptando el lenguaje para ser más dinámico y apropiado para transmisión radial.

${reglasParaTTS}

Noticia:
${content}`
        break
      case 'humanize':
        systemPrompt = 'Eres un locutor de radio profesional chileno. Tu trabajo es humanizar noticias para que suenen naturales al ser leídas por un sistema TTS.'
        userPrompt = `Humaniza esta noticia para que suene como si un locutor de radio chileno la estuviera contando de manera natural y conversacional.

${reglasParaTTS}

Noticia:
${content}`
        break
      case 'adapt':
        systemPrompt = 'Adapta el tono y estilo de las noticias según la identidad de la radio. El texto será leído por TTS.'
        userPrompt = `Adapta esta noticia al estilo ${radioStyle || 'profesional y objetivo'}. Mantén los hechos pero ajusta el tono y enfoque.

${reglasParaTTS}

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

    if (provider === 'chutes') {
      apiUrl = CHUTES_CONFIG.endpoints.chatCompletions
      headers = getChutesHeaders()
      body = {
        model: CHUTES_CONFIG.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
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
    const processedContent = data.choices[0]?.message?.content

    if (!processedContent) {
      throw new Error('No content generated')
    }

    // Registrar uso de tokens
    if (data.usage) {
      const tokensUsed = data.usage.total_tokens || 0
      let cost = 0

      if (provider === 'chutes') {
        cost = calculateChutesAICost(tokensUsed)
      } else if (provider === 'groq') {
        cost = calculateGroqCost(tokensUsed)
      } else {
        cost = calculateAbacusAICost(tokensUsed, model)
      }

      await logTokenUsage({
        user_id: userId,
        servicio: provider === 'chutes' ? 'chutes' : (provider === 'groq' ? 'groq' : 'abacus'),
        operacion: 'procesamiento_texto',
        tokens_usados: tokensUsed,
        costo: cost,
        metadata: {
          model: provider === 'chutes' ? CHUTES_CONFIG.model : model,
          step,
          radioStyle,
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens
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
      model: provider === 'chutes' ? CHUTES_CONFIG.model : model,
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
