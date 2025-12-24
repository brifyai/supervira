export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    // ✅ Solo voces de Gemini 2.5 Pro Preview TTS con acento chileno
    const { GEMINI_TTS_VOICES } = await import("@/lib/gemini/tts");

    // Mapear las voces de Gemini (ya definidas en lib/gemini/tts.ts)
    // Incluye 3 voces masculinas y 3 femeninas con acento chileno
    const geminiVoices = process.env.GOOGLE_GEMINI_API_KEY
      ? Object.values(GEMINI_TTS_VOICES)
          .filter((voice) => voice.id !== "es-CL-default") // Excluir voz genérica "default"
          .map((voice) => ({
            id: voice.id,
            name: voice.name,
            language: voice.language,
            type: "gemini",
            isUserVoice: false,
            wpm: voice.wpm,
            tempo: 4.0,
            avg_pause_ms: voice.avgPauseMs,
            energy_profile: "news",
            gender: voice.gender,
            pitchRange: voice.pitchRange,
            speedRange: voice.speedRange,
          }))
      : [];

    return NextResponse.json({
      success: true,
      voices: geminiVoices,
      provider: "gemini-2.5-pro-preview-tts",
    });
  } catch (error) {
    console.error("Error fetching voices:", error);
    return NextResponse.json(
      { error: "Error al obtener voces disponibles" },
      { status: 500 },
    );
  }
}
