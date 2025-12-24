import { NextRequest, NextResponse } from "next/server";
import { TTSProviderFactory } from "@/lib/tts-providers";
import { getDownloadUrl } from "@/lib/s3";

// Real síntesis de voz usando múltiples proveedores
interface TTSRequest {
  text: string;
  provider?: "gemini" | "local" | "auto"; // Gemini 2.5 Pro Preview TTS es el proveedor principal
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number; // ✅ NUEVO: Volumen en dB
  format?: "mp3" | "wav" | "ogg";
  // Opciones específicas por proveedor
  stability?: number;
  similarityBoost?: number;
  rate?: string;
  // ✅ NUEVO: Estilo de voz para Gemini TTS
  style?: "alegre" | "triste" | "susurrar" | "storyteller" | "natural";
}

// Función auxiliar para mapear opciones por proveedor
function getProviderOptions(provider: string, request: TTSRequest) {
  switch (provider) {
    case "elevenlabs":
      return {
        voice: request.voice || "Adam",
        stability: request.stability || 0.5,
        similarityBoost: request.similarityBoost || 0.8,
        style: 0.0,
      };
    case "azure":
      return {
        voice: request.voice || "es-CL-CatalinaNeural",
        rate: request.rate || "+0%",
        pitch: request.pitch || "+0Hz",
      };
    case "openai":
      return {
        voice: request.voice || "nova",
        model: "tts-1",
        speed: request.speed || 1.0,
      };
    case "polly":
      return {
        voice: request.voice || "Conchita",
        engine: "neural",
        outputFormat: request.format || "mp3",
      };
    case "edge":
      return {
        voice: request.voice || "es-CL-CatalinaNeural",
        rate: request.rate || "+0%",
        pitch: request.pitch || "+0Hz",
      };
    default:
      return {};
  }
}

// Función auxiliar para escribir cabecera WAV
function writeWavHeader(
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number,
  dataLength: number,
) {
  const buffer = Buffer.alloc(44);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);
  return buffer;
}

export async function POST(request: NextRequest) {
  try {
    const requestData: TTSRequest = await request.json();
    const { text, provider = "auto", format = "mp3", voice } = requestData;

    // Validaciones básicas
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Texto requerido para síntesis" },
        { status: 400 },
      );
    }

    if (text.length > 4000) {
      return NextResponse.json(
        {
          success: false,
          error: "Texto demasiado largo (máximo 4000 caracteres)",
        },
        { status: 400 },
      );
    }

    console.log(`🎙️ Iniciando síntesis de voz: ${text.length} caracteres`);
    const startTime = Date.now();

    console.log("[DEBUG TTS] Request data:", JSON.stringify({
      provider,
      voice,
      textLength: text.length,
      hasGeminiKey: !!process.env.GOOGLE_GEMINI_API_KEY,
      hasProjectId: !!process.env.GOOGLE_PROJECT_ID
    }));

    // PRIORIDAD 1: Google Gemini 2.5 Pro Preview TTS API (Cloud)
    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (geminiApiKey) {
      try {
        console.log("🔄 Usando Google Gemini 2.5 Pro Preview TTS API...");
        console.log(
          `🗣️ Voice requested: ${voice || "es-CL-default (default)"}`,
        );
        console.log("[DEBUG TTS] Gemini API Key exists:", !!geminiApiKey);
        console.log("[DEBUG TTS] Project ID:", process.env.GOOGLE_PROJECT_ID);

        const { GeminiTTSProvider, GEMINI_VOICES } =
          await import("@/lib/tts-providers");
        const geminiProvider = new GeminiTTSProvider(geminiApiKey);

        // Determinar voz a usar
        const voiceId = voice || GEMINI_VOICES.MALE_2.id;

        const result = await geminiProvider.synthesize(text, {
          voiceId: voiceId,
          speed: requestData.speed,
          pitch: requestData.pitch,
          volume: requestData.volume,
          style: requestData.style || "natural", // ✅ NUEVO: Estilo de voz
        });

        if (!result.success) {
          throw new Error("Gemini TTS synthesis failed");
        }

        // Guardar localmente en public/generated-audio/
        const fs = require("fs");
        const path = require("path");

        const audioDir = path.join(process.cwd(), "public", "generated-audio");
        if (!fs.existsSync(audioDir)) {
          fs.mkdirSync(audioDir, { recursive: true });
        }

        const timestamp = Date.now();
        const fileName = `tts_${timestamp}.mp3`;
        const filePath = path.join(audioDir, fileName);

        // Guardar el audio generado
        if (result.audioData) {
          fs.writeFileSync(filePath, Buffer.from(result.audioData));
        }

        const audioUrl = `/generated-audio/${fileName}`;
        const processingTime = Date.now() - startTime;

        console.log(
          `✅ Audio generado exitosamente con Gemini 2.5 Pro Preview TTS: ${processingTime}ms`,
        );
        console.log(`📁 Guardado en: ${filePath}`);

        return NextResponse.json({
          success: true,
          provider: "gemini",
          voice: voiceId,
          duration: result.duration || 0,
          audioUrl: audioUrl,
          format: "mp3",
          metadata: {
            textLength: text.length,
            processingTime,
            estimatedCost: result.cost || 0,
            provider: "Google Gemini 2.5 Pro Preview TTS",
            configuredProviders: ["Gemini 2.5 Pro Preview TTS"],
            synthesizedAt: new Date().toISOString(),
          },
        });
      } catch (geminiError) {
        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            "❌ Gemini 2.5 Pro Preview TTS Error:",
            geminiError instanceof Error
              ? geminiError.message
              : "Error desconocido",
          );
          console.log("[DEBUG TTS] Error details:", errorText);
          console.log("🔄 Intentando con proveedores alternativos...");
      }
    } else {
      console.warn(
        "⚠️ GOOGLE_GEMINI_API_KEY no configurada, intentando proveedores alternativos...",
      );
    }

    // Intentar con proveedores alternativos si falla Gemini
    const providerToUse =
      provider === "auto"
        ? TTSProviderFactory.getBestProvider()
        : TTSProviderFactory.getProvider(provider);

    if (!providerToUse) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No hay proveedores de TTS disponibles. Asegúrate de que el servidor local esté corriendo en localhost:5000 o configura ElevenLabs/Azure.",
        },
        { status: 503 },
      );
    }

    console.log(`🔄 Usando proveedor: ${providerToUse.name}`);

    // Mapear opciones según el proveedor
    const providerOptions = getProviderOptions(
      providerToUse.name.toLowerCase(),
      requestData,
    );

    // Sintetizar voz
    const result = await providerToUse.synthesize(text, providerOptions);

    if (!result.success) {
      throw new Error(`Error en síntesis con ${providerToUse.name}`);
    }

    // Obtener URL de descarga si se subió a S3
    const audioUrl = result.s3Key
      ? await getDownloadUrl(result.s3Key)
      : result.audioUrl;

    const processingTime = Date.now() - startTime;

    console.log(
      `✅ Audio generado exitosamente con ${providerToUse.name}: ${processingTime}ms`,
    );

    return NextResponse.json({
      success: true,
      provider: result.provider,
      voice: result.voice,
      duration: result.duration,
      audioUrl: audioUrl,
      s3Key: result.s3Key,
      format: format,
      metadata: {
        textLength: text.length,
        processingTime,
        estimatedCost: result.cost,
        provider: providerToUse.name,
        configuredProviders: TTSProviderFactory.getAvailableProviders().map(
          (p) => p.name,
        ),
        synthesizedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("TTS API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido en síntesis de voz",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 },
    );
  }
}

// Endpoint para obtener proveedores disponibles
export async function GET() {
  try {
    const allProviders = TTSProviderFactory.getAllProviders();
    const configuredProviders = TTSProviderFactory.getAvailableProviders();
    const bestProvider = TTSProviderFactory.getBestProvider();

    const providersInfo = allProviders.map((provider) => ({
      name: provider.name,
      id: provider.name.toLowerCase().replace(" ", ""),
      configured: provider.isConfigured(),
      estimatedCost: provider.estimateCost(1000), // Costo por 1000 caracteres
      recommended: provider.name === bestProvider.name,
    }));

    return NextResponse.json({
      success: true,
      providers: providersInfo,
      totalProviders: allProviders.length,
      configuredProviders: configuredProviders.length,
      bestProvider: bestProvider.name,
      notes: {
        auto: 'Usa "auto" como provider para selección automática del mejor proveedor disponible',
        fallback:
          "Edge TTS se usa como fallback gratuito si otros proveedores no están configurados",
      },
    });
  } catch (error) {
    console.error("Error getting TTS providers info:", error);
    return NextResponse.json(
      { success: false, error: "Error obteniendo información de proveedores" },
      { status: 500 },
    );
  }
}
