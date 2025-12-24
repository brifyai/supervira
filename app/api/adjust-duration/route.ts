import { NextRequest, NextResponse } from "next/server";
import { getSupabaseSession, supabaseAdmin } from "@/lib/supabase-server";
import { logTokenUsage } from "@/lib/usage-logger";
import { adjustTextDuration } from "@/lib/gemini/chat";
import { calculateGeminiCost } from "@/lib/gemini/config";

const supabase = supabaseAdmin;

// Estimación calibrada: 10.5 caracteres por segundo (basado en pruebas reales: 19:12 vs 15:58)
const DEFAULT_CHARS_PER_SECOND = 12.5;

export async function POST(request: NextRequest) {
  try {
    const session = await getSupabaseSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { newscastId, targetDuration, readingPace } = body;

    // Usar el ritmo proporcionado o el defecto
    const charsPerSecond = readingPace || DEFAULT_CHARS_PER_SECOND;

    // Estimación de palabras por minuto basada en caracteres por segundo (promedio 5 chars/palabra + 1 espacio)
    const wordsPerMinute = Math.floor((charsPerSecond * 60) / 6);

    if (!newscastId || !targetDuration) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 },
      );
    }

    // 1. Obtener noticiero
    const { data: newscast, error: fetchError } = await supabase
      .from("noticieros")
      .select("*")
      .eq("id", newscastId)
      .eq("user_id", session.user.id)
      .single();

    if (fetchError || !newscast) {
      return NextResponse.json(
        { error: "Noticiero no encontrado" },
        { status: 404 },
      );
    }

    // 2. Obtener timeline
    let timelineData = newscast.datos_timeline;
    if (typeof timelineData === "string") {
      timelineData = JSON.parse(timelineData);
    }

    let timeline = Array.isArray(timelineData)
      ? timelineData
      : timelineData?.timeline || [];

    // Filtrar solo noticias (ignorar intro, outro, anuncios)
    const newsItems = timeline.filter(
      (item: any) => item.type === "news" || !item.type,
    );

    if (newsItems.length === 0) {
      return NextResponse.json(
        { error: "No hay noticias para ajustar" },
        { status: 400 },
      );
    }

    // 3. Calcular duración actual de noticias
    const currentNewsDuration = newsItems.reduce(
      (acc: number, item: any) => acc + (item.duration || 0),
      0,
    );

    // Calcular duración de otros elementos (intro, ads, etc)
    const otherItemsDuration = timeline
      .filter((item: any) => item.type !== "news" && item.type)
      .reduce((acc: number, item: any) => acc + (item.duration || 0), 0);

    // El tiempo disponible para noticias es el target menos lo que ocupan los otros elementos
    const targetNewsDuration = targetDuration - otherItemsDuration;

    if (targetNewsDuration <= 0) {
      return NextResponse.json(
        {
          error:
            "El tiempo objetivo es demasiado corto para los elementos fijos (intro/ads)",
        },
        { status: 400 },
      );
    }

    // Factor de ajuste
    const ratio = targetNewsDuration / currentNewsDuration;
    console.log(
      `⏱️ Ajuste: Actual=${currentNewsDuration}s, Objetivo=${targetNewsDuration}s, Ratio=${ratio.toFixed(2)}, Ritmo=${charsPerSecond} chars/s`,
    );

    // Si el ratio es muy cercano a 1 (ej. 0.95 a 1.05), no vale la pena reescribir todo
    if (ratio > 0.95 && ratio < 1.05) {
      return NextResponse.json({
        success: true,
        message: "La duración ya está optimizada",
        timeline: timelineData,
      });
    }

    // 4. Reescribir noticias con Gemini 2.5 Flash
    let totalTokensUsed = 0;
    const updatedTimeline = [...timeline];

    for (let i = 0; i < updatedTimeline.length; i++) {
      const item = updatedTimeline[i];

      // Solo procesar noticias
      if (item.type !== "news" && item.type) continue;

      // Calcular nueva duración objetivo para esta noticia
      const currentItemDuration = item.duration || 30;
      const targetItemDuration = Math.floor(currentItemDuration * ratio);

      // Calcular palabras objetivo usando el ritmo configurado
      const targetWords = Math.floor(
        (targetItemDuration * wordsPerMinute) / 60,
      );

      console.log(
        `📝 Reescribiendo noticia "${item.title}" para durar ~${targetItemDuration}s (${targetWords} palabras)`,
      );

      // Obtener contexto de transición
      const isFirst =
        i === 0 ||
        updatedTimeline
          .slice(0, i)
          .filter((x: any) => x.type === "news" || !x.type).length === 0;
      const isLast =
        i === updatedTimeline.length - 1 ||
        updatedTimeline
          .slice(i + 1)
          .filter((x: any) => x.type === "news" || !x.type).length === 0;
      const prevNewsItem = updatedTimeline
        .slice(0, i)
        .reverse()
        .find((x: any) => x.type === "news" || !x.type);
      const categoryChanged =
        prevNewsItem && prevNewsItem.category !== item.category;

      // Construir sección de transición
      let transitionInstructions = "";
      if (isFirst) {
        transitionInstructions =
          '- Es la PRIMERA noticia: Comienza con "Comenzamos con..." o "Partimos con..."';
      } else if (isLast) {
        transitionInstructions =
          '- Es la ÚLTIMA noticia: Usa "Para finalizar..." o "Cerramos con..."';
      } else if (categoryChanged) {
        transitionInstructions = `- La categoría cambió a ${item.category}. Usa transición: "Pasamos a ${item.category}..." o "En ${item.category}..."`;
      } else if (item.category) {
        transitionInstructions = `- Misma categoría (${item.category}): Usa "También..." o "Siguiendo con..." o "Otra noticia..."`;
      }

      try {
        // Usar Gemini 2.5 Flash para ajustar la duración del texto
        const result = await adjustTextDuration(
          item.content,
          targetItemDuration,
          currentItemDuration,
        );

        if (result.success && result.text) {
          const tokens = result.tokens || 0;
          totalTokensUsed += tokens;

          // Calcular factor de velocidad (12.5 es el estándar)
          // Si pace es 15, speed = 1.2 (20% más rápido)
          // Si pace es 10, speed = 0.8 (20% más lento)
          const speedFactor = charsPerSecond / 12.5;

          // Actualizar item
          updatedTimeline[i] = {
            ...item,
            content: result.text,
            duration: targetItemDuration, // Actualizamos la duración estimada
            speed: speedFactor, // Guardamos la velocidad para el TTS
            audioUrl: null, // Invalidar audio anterior
            aiProvider: "gemini", // Indicar que se usó Gemini
            versions: {
              ...item.versions,
              ai_adjusted: result.text, // Guardar versión
            },
            activeVersion: "ai_adjusted",
          };

          console.log(`✅ Noticia reescrita exitosamente (${tokens} tokens)`);
        } else {
          console.error(
            `❌ Error ajustando duración con Gemini: ${result.error}`,
          );
        }
      } catch (err) {
        console.error(`Error procesando noticia ${item.id}:`, err);
      }
    }

    // 5. Registrar uso de tokens con Gemini
    if (totalTokensUsed > 0) {
      const cost = calculateGeminiCost(totalTokensUsed, "chat");

      await logTokenUsage({
        user_id: session.user.id,
        servicio: "gemini",
        operacion: "procesamiento_texto",
        tokens_usados: totalTokensUsed,
        costo: cost,
        metadata: {
          newscast_id: newscastId,
          target_duration: targetDuration,
          model: "gemini-2.5-flash",
          provider: "Gemini 2.5 Flash",
        },
      });
    }

    // 6. Actualizar DB
    const newTotalDuration = updatedTimeline.reduce(
      (acc, item) => acc + (item.duration || 0),
      0,
    );

    const newTimelineData = {
      ...timelineData,
      timeline: updatedTimeline,
      metadata: {
        ...timelineData?.metadata,
        totalDuration: newTotalDuration,
      },
    };

    const { error: updateError } = await supabase
      .from("noticieros")
      .update({
        datos_timeline: newTimelineData,
        duracion_segundos: newTotalDuration,
        updated_at: new Date().toISOString(),
      })
      .eq("id", newscastId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      timeline: newTimelineData,
      tokensUsed: totalTokensUsed,
      message: "Duración ajustada exitosamente con Gemini 2.5 Flash",
    });
  } catch (error: any) {
    console.error("Error en adjust-duration:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
