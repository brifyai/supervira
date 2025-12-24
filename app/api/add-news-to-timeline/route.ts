import { NextRequest, NextResponse } from "next/server";
import { getSupabaseSession, supabaseAdmin } from "@/lib/supabase-server";
import { logTokenUsage } from "@/lib/usage-logger";
import { humanizeNewsText as geminiHumanizeNewsText } from "@/lib/gemini/chat";
import { calculateGeminiCost } from "@/lib/gemini/config";

const supabase = supabaseAdmin;

/**
 * Humaniza el texto de la noticia usando Gemini 2.5 Flash
 * Mismas reglas que generate-newscast para consistencia
 */
async function humanizeNewsText(
  text: string,
  region: string,
  userId: string,
  context: { index: number; total: number; category: string },
): Promise<{ content: string; tokensUsed: number; cost: number }> {
  try {
    console.log(
      `🧠 Humanizando texto con Gemini 2.5 Flash para noticia (${text.length} caracteres)...`,
    );

    // Usar Gemini 2.5 Flash para humanizar el texto
    const result = await geminiHumanizeNewsText(text, {
      region,
      style: "formal",
    });

    if (!result.success || !result.text) {
      console.error("❌ Error en Gemini 2.5 Flash:", result.error);
      throw new Error(result.error || "Error humanizando texto con Gemini");
    }

    const content = result.text;
    const tokensUsed =
      result.tokens || Math.ceil((text.length + content.length) / 4);
    const cost = calculateGeminiCost(tokensUsed, "chat");

    // Registrar uso de tokens
    if (tokensUsed > 0) {
      await logTokenUsage({
        user_id: userId,
        servicio: "gemini",
        operacion: "humanizacion",
        tokens_usados: tokensUsed,
        costo: cost,
        metadata: {
          model: "gemini-2.5-flash",
          region,
          text_length: text.length,
          category: context.category,
          context: `noticia ${context.index + 1} de ${context.total}`,
        },
      });
    }

    console.log(
      `✅ Texto humanizado exitosamente (${tokensUsed} tokens, $${cost.toFixed(6)})`,
    );

    return { content, tokensUsed, cost };
  } catch (error) {
    console.error("Error humanizando texto:", error);
    // Fallback: devolver texto original
    return { content: text, tokensUsed: 0, cost: 0 };
  }
}

/**
 * POST /api/add-news-to-timeline
 * Agrega una noticia scrapeada al timeline de un noticiero
 * - Humaniza el texto automáticamente con Gemini 2.5 Flash
 * - NO genera audio (se genera al finalizar)
 * - Registra uso de tokens
 *
 * Body:
 * - newscastId: string
 * - newsId: string (ID de noticias_scrapeadas)
 */
export async function POST(request: NextRequest) {
  try {
    // Autenticación
    const session = await getSupabaseSession();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { newscastId, newsId } = body;

    if (!newscastId || !newsId) {
      return NextResponse.json(
        { error: "newscastId y newsId son requeridos" },
        { status: 400 },
      );
    }

    console.log(`➕ Agregando noticia ${newsId} al noticiero ${newscastId}`);

    // 1. Verificar que el noticiero existe y pertenece al usuario
    const { data: newscast, error: newscastError } = await supabase
      .from("noticieros")
      .select("*")
      .eq("id", newscastId)
      .eq("user_id", userId)
      .single();

    if (newscastError || !newscast) {
      return NextResponse.json(
        { error: "Noticiero no encontrado o no tienes permisos" },
        { status: 404 },
      );
    }

    // 2. Obtener la noticia de noticias_scrapeadas
    const { data: scrapedNews, error: newsError } = await supabase
      .from("noticias_scrapeadas")
      .select("*")
      .eq("id", newsId)
      .single();

    if (newsError || !scrapedNews) {
      return NextResponse.json(
        { error: "Noticia no encontrada" },
        { status: 404 },
      );
    }

    console.log(`📰 Noticia encontrada: ${scrapedNews.titulo}`);

    // 3. Obtener timeline actual para saber contexto
    let timelineData = newscast.datos_timeline;
    if (typeof timelineData === "string") {
      timelineData = JSON.parse(timelineData);
    }
    let timeline = Array.isArray(timelineData)
      ? timelineData
      : timelineData?.timeline || [];
    const newsCount = timeline.filter(
      (item: any) => item.type === "news" || !item.type,
    ).length;

    // 4. Humanizar el texto de la noticia usando Gemini 2.5 Flash
    console.log("🧠 Humanizando texto de la noticia con Gemini 2.5 Flash...");
    const region = newscast.region || "Chile";
    const rawText = `${scrapedNews.titulo}. ${scrapedNews.contenido || scrapedNews.resumen || ""}`;

    const humanizedResult = await humanizeNewsText(rawText, region, userId, {
      index: newsCount,
      total: newsCount + 1,
      category: scrapedNews.categoria || "general",
    });

    console.log(
      `✅ Texto humanizado (${humanizedResult.tokensUsed} tokens, $${humanizedResult.cost.toFixed(6)})`,
    );

    // 5. Verificar que la noticia no existe ya en el timeline
    const existingNews = timeline.find((item: any) => item.newsId === newsId);
    if (existingNews) {
      return NextResponse.json(
        { error: "Esta noticia ya está en el timeline" },
        { status: 400 },
      );
    }

    // 6. Estimar duración (aprox 150 palabras por minuto)
    const wordCount = humanizedResult.content.split(" ").length;
    const estimatedDuration = Math.ceil((wordCount / 150) * 60);

    // 7. Crear item para el timeline con ID único
    const uniqueId = `news_${newsId}_${Date.now()}`; // ID único para React keys
    const newNewsItem = {
      id: uniqueId, // ID único para el timeline
      newsId: newsId, // ID original de la noticia (para referencia)
      type: "news",
      title: scrapedNews.titulo,
      originalContent: rawText,
      content: humanizedResult.content,
      category: scrapedNews.categoria || "general",
      source: scrapedNews.fuente,
      duration: estimatedDuration,
      audioUrl: null, // Se generará al finalizar
      isHumanized: true,
      addedManually: true,
      voiceId: "default",
      aiProvider: "gemini", // Indicar que se usó Gemini
    };

    // 8. Agregar al timeline ANTES del cierre/outro
    // Buscar índice del cierre o outro para insertar antes
    const outroIndex = timeline.findIndex(
      (item: any) =>
        item.type === "outro" ||
        item.type === "cierre" ||
        item.title?.toLowerCase().includes("cierre") ||
        item.title?.toLowerCase().includes("despedida"),
    );

    if (outroIndex !== -1) {
      // Insertar antes del cierre
      timeline.splice(outroIndex, 0, newNewsItem);
      console.log(
        `📍 Noticia insertada en posición ${outroIndex} (antes del cierre)`,
      );
    } else {
      // No hay cierre, agregar al final
      timeline.push(newNewsItem);
      console.log(`📍 Noticia agregada al final del timeline`);
    }

    // 9. Actualizar metadata
    const totalDuration = timeline.reduce(
      (sum: number, item: any) => sum + (item.duration || 30),
      0,
    );

    const updatedTimelineData = {
      timeline,
      metadata: {
        totalDuration,
        targetDuration: newscast.duracion_segundos || 900,
        newsCount: timeline.filter(
          (item: any) => item.type === "news" || !item.type,
        ).length,
        region: newscast.region,
        generatedAt: newscast.created_at,
        lastModified: new Date().toISOString(),
      },
    };

    // 10. Actualizar noticiero en BD
    const { error: updateError } = await supabase
      .from("noticieros")
      .update({
        datos_timeline: updatedTimelineData,
        duracion_segundos: totalDuration,
        updated_at: new Date().toISOString(),
      })
      .eq("id", newscastId);

    if (updateError) {
      console.error("Error actualizando noticiero:", updateError);
      return NextResponse.json(
        { error: "Error actualizando noticiero" },
        { status: 500 },
      );
    }

    // 11. Marcar noticia como procesada
    await supabase
      .from("noticias_scrapeadas")
      .update({ fue_procesada: true })
      .eq("id", newsId);

    console.log("✅ Noticia agregada exitosamente al timeline");

    return NextResponse.json({
      success: true,
      newsItem: newNewsItem,
      timeline: updatedTimelineData,
      tokensUsed: humanizedResult.tokensUsed,
      cost: humanizedResult.cost,
      message:
        "Noticia agregada y humanizada exitosamente con Gemini 2.5 Flash. El audio se generará al finalizar el noticiero.",
    });
  } catch (error) {
    console.error("Error en /api/add-news-to-timeline:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
