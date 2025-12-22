import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseSession, supabaseAdmin } from '@/lib/supabase-server';
import { assembleNewscast, getNewscastSegments } from '@/lib/audio-assembler';
import fs from 'fs';
import path from 'path';

const supabase = supabaseAdmin;

// Función para limpiar texto RAW antes de humanizar (evita errores CUDA)
function sanitizeTextForTTS(text: string): string {
  if (!text) return '';
  // 1. Eliminar timestamps al inicio (ej: "08:10 | ", "12:30 hrs |")
  let clean = text.replace(/^\d{1,2}:\d{2}\s*(hrs|horas|pm|am)?\s*[|•-]\s*/i, '');
  // 2. Eliminar prefijos comunes
  clean = clean.replace(/^(URGENTE|AHORA|ÚLTIMO MINUTO)\s*[|•-]\s*/i, '');
  // 3. Reemplazar pipes por puntos
  clean = clean.replace(/\s+\|\s+/g, '. ');
  return clean;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSupabaseSession();
    const userId = session?.user?.id;
    // ✅ FIX: Obtener email al inicio para evitar llamar getCurrentUser() después del ensamblaje
    const userEmail = session?.user?.email;

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { newscastId, includeMusic, includeFx, backgroundMusicUrl, backgroundMusicVolume, selectedNewsIds, forceExactDuration, targetDuration } = body;

    // Nota: El frontend envía 'newscastId', pero el código anterior usaba 'noticieroId'. 
    // Estandarizamos a 'newscastId' o 'noticieroId' (soportamos ambos)
    const targetId = newscastId || body.noticieroId;

    if (!targetId) {
      return NextResponse.json({ error: 'newscastId es requerido' }, { status: 400 });
    }

    console.log(`🎬 Iniciando finalización de noticiero: ${targetId}`);

    // 1. Verificar que el noticiero existe y pertenece al usuario
    const { data: noticiero, error: noticieroError } = await supabase
      .from('noticieros')
      .select('*')
      .eq('id', targetId)
      .eq('user_id', userId)
      .single();

    if (noticieroError || !noticiero) {
      return NextResponse.json(
        { error: 'Noticiero no encontrado o no tienes permisos' },
        { status: 404 }
      );
    }

    // 2. Verificar que el noticiero no esté ya completado
    if (noticiero.estado === 'completado') {
      return NextResponse.json(
        {
          success: true,
          message: 'Noticiero ya está completado',
          audioUrl: noticiero.url_audio,
          duration: noticiero.duracion_segundos
        },
        { status: 200 }
      );
    }

    // 3. Obtener timeline completo para verificar audios faltantes
    console.log('🔍 Debug: Raw datos_timeline type:', typeof noticiero.datos_timeline);
    console.log('🔍 Debug: Raw datos_timeline isArray:', Array.isArray(noticiero.datos_timeline));

    let timeline: any[] = [];

    if (Array.isArray(noticiero.datos_timeline)) {
      // Caso 1: datos_timeline es directamente el array (formato antiguo o simple)
      console.log('🔍 Debug: Detected array format');
      timeline = noticiero.datos_timeline;
    } else if (noticiero.datos_timeline?.timeline && Array.isArray(noticiero.datos_timeline.timeline)) {
      // Caso 2: datos_timeline es un objeto con propiedad timeline (formato nuevo)
      console.log('🔍 Debug: Detected object format with .timeline property');
      timeline = noticiero.datos_timeline.timeline;
    } else {
      console.warn('⚠️ Warning: Could not extract timeline from datos_timeline');
      timeline = [];
    }

    // Normalizar timeline con IDs si faltan (igual que en frontend)
    const normalizedTimeline = timeline.map((item: any, index: number) => ({
      ...item,
      id: item.id || `item-${index}`
    }));

    // Filtrar items seleccionados
    let itemsToProcess = normalizedTimeline;

    console.log(`🔍 Debug: selectedNewsIds received:`, selectedNewsIds);
    console.log(`🔍 Debug: Timeline has ${normalizedTimeline.length} items. First item ID:`, normalizedTimeline[0]?.id);

    if (selectedNewsIds && Array.isArray(selectedNewsIds) && selectedNewsIds.length > 0) {
      itemsToProcess = normalizedTimeline.filter((item: any) => selectedNewsIds.includes(item.id));
      console.log(`🔍 Debug: Filtered items count: ${itemsToProcess.length}`);
    } else {
      // Si no hay selección, usar todos los items de tipo 'news' o indefinido
      itemsToProcess = normalizedTimeline.filter((item: any) => item.type === 'news' || !item.type);
    }

    if (itemsToProcess.length === 0) {
      console.error('❌ Error: No items to process after filtering.');
      return NextResponse.json(
        { error: 'No hay noticias seleccionadas para procesar.' },
        { status: 400 }
      );
    }

    // 3.1 Verificar y generar audios faltantes
    console.log(`🔍 Verificando audios para ${itemsToProcess.length} items...`);
    let updatedCount = 0;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Extract global voice preference from metadata
    const globalVoiceId = noticiero.metadata?.config?.voiceModel || noticiero.metadata?.voiceModel || noticiero.metadata?.voice_model || 'gemini-male-2';
    // ✅ NUEVO: Obtener configuración de voz desde metadata para Gemini 2.5 Flash TTS
    const globalVoiceSettings = noticiero.metadata?.voice_settings || noticiero.metadata?.config?.voiceSettings || {
      speed: 13,      // Default para Gemini TTS
      pitch: 0,
      volume: 2,
      style: 'natural'  // Estilo por defecto para Gemini
    };
    console.log(`🔍 Global Voice ID from metadata: ${globalVoiceId}`);
    console.log(`🔍 Voice Settings: speed=${globalVoiceSettings.speed}, pitch=${globalVoiceSettings.pitch}, volume=${globalVoiceSettings.volume}, style=${globalVoiceSettings.style}`);

    for (const item of itemsToProcess) {
      if (!item.audioUrl && item.content) {
        console.log(`🎙️ Generando audio faltante para: ${item.title || item.id}`);
        const targetVoiceId = item.voiceId || globalVoiceId;
        console.log(`🔍 Debug: Item Voice ID: ${item.voiceId || 'undefined'} (Using: '${targetVoiceId}')`);

        // Retry logic for TTS generation
        let attempts = 0;
        const maxAttempts = 3;
        let success = false;

        while (attempts < maxAttempts && !success) {
          attempts++;
          try {
            if (attempts > 1) console.log(`🔄 Reintento ${attempts}/${maxAttempts} para ${item.id}...`);



            const ttsResponse = await fetch(`${APP_URL}/api/text-to-speech`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: sanitizeTextForTTS(item.content),
                voice: targetVoiceId,
                language: 'es',
                format: 'mp3',
                provider: 'gemini',
                // ✅ CORREGIDO: Pasar configuraciones de voz para Gemini 2.5 Flash TTS
                speed: globalVoiceSettings.speed ?? 13,
                pitch: globalVoiceSettings.pitch ?? 0,
                volume: globalVoiceSettings.volume ?? 2,
                style: globalVoiceSettings.style || 'natural'
              })
            });

            if (ttsResponse.ok) {
              const ttsData = await ttsResponse.json();
              if (ttsData.success) {
                item.audioUrl = ttsData.audioUrl;
                item.duration = ttsData.duration;
                updatedCount++;
                success = true;
                console.log(`✅ Audio generado para ${item.id}`);
              } else {
                throw new Error(`TTS API returned success=false: ${JSON.stringify(ttsData)}`);
              }
            } else {
              throw new Error(`TTS API HTTP error: ${ttsResponse.status} ${await ttsResponse.text()}`);
            }
          } catch (err) {
            console.error(`❌ Error conectando con TTS para ${item.id} (Intento ${attempts}):`, err);
            if (attempts < maxAttempts) {
              // Wait before retrying (exponential backoff: 1s, 2s, 4s...)
              const delay = 1000 * Math.pow(2, attempts - 1);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.error(`❌ Fallaron todos los intentos para ${item.id}`);
            }
          }
        }
      }
    }

    // 3.2 Si hubo actualizaciones, guardar en BD
    if (updatedCount > 0) {
      console.log(`💾 Guardando ${updatedCount} nuevos audios en timeline...`);
      // Actualizar el timeline original con los items modificados
      // (itemsToProcess son referencias a objetos dentro de timeline, así que timeline ya está modificado)

      const { error: updateTimelineError } = await supabase
        .from('noticieros')
        .update({
          datos_timeline: { ...noticiero.datos_timeline, timeline: timeline },
          updated_at: new Date().toISOString()
        })
        .eq('id', targetId);

      if (updateTimelineError) {
        console.error('Error guardando timeline actualizado:', updateTimelineError);
      }
    }

    // 3.3 Construir segmentos para el ensamblador
    // Usamos itemsToProcess que ahora deberían tener audioUrl
    const segments = itemsToProcess
      .filter((item: any) => item.audioUrl) // Asegurarnos que tengan audio
      .map((item: any) => ({
        id: item.id,
        audioUrl: item.audioUrl,
        duration: item.duration || 0,
        fadeIn: item.fadeIn,
        fadeOut: item.fadeOut,
        volume: item.volume || 1.0,
        type: item.type
      }));

    if (segments.length === 0) {
      return NextResponse.json(
        { error: 'No se pudieron generar los audios. Asegúrate de que el servidor TTS esté funcionando.' },
        { status: 400 }
      );
    }

    console.log(`✅ ${segments.length} segmentos a procesar`);

    // 4. Determinar música de fondo (del request o del noticiero)
    const finalBackgroundMusicUrl = backgroundMusicUrl || noticiero.background_music_url;
    const finalBackgroundMusicVolume = backgroundMusicVolume ?? noticiero.background_music_volume ?? 0.2;
    const backgroundMusicConfig = noticiero.background_music_config as {
      mode: 'global' | 'range';
      fromNews?: number;
      toNews?: number;
    } | null;

    if (finalBackgroundMusicUrl) {
      console.log(`🎶 Música de fondo configurada: ${finalBackgroundMusicUrl} (volumen: ${finalBackgroundMusicVolume})`);
      if (backgroundMusicConfig) {
        console.log(`   Modo: ${backgroundMusicConfig.mode}${backgroundMusicConfig.mode === 'range' ? ` (noticias ${backgroundMusicConfig.fromNews}-${backgroundMusicConfig.toNews})` : ''}`);
      }
    }

    // 5. Ensamblar el audio final
    console.log('🎵 Ensamblando audio final...');
    const assemblyResult = await assembleNewscast(segments, {
      includeMusic: includeMusic || !!finalBackgroundMusicUrl,
      includeFx: includeFx || false,
      backgroundMusicUrl: finalBackgroundMusicUrl,
      backgroundMusicVolume: finalBackgroundMusicVolume,
      backgroundMusicConfig: backgroundMusicConfig,
      normalizeAudio: false, // Desactivado para preservar calidad de F5-TTS
      outputFormat: 'mp3', // Forzar MP3 siempre
      forceExactDuration: forceExactDuration || false,
      targetDuration: targetDuration
    });

    if (!assemblyResult.success) {
      return NextResponse.json(
        { error: `Error en ensamblaje: ${assemblyResult.error}` },
        { status: 500 }
      );
    }

    // 5.1 LIMPIEZA: Eliminar fragmentos TTS usados en este noticiero
    console.log('🧹 Limpiando fragmentos TTS...');
    const generatedAudioDir = path.join(process.cwd(), 'public', 'generated-audio');
    let fragmentsDeleted = 0;

    for (const segment of segments) {
      if (segment.audioUrl && segment.audioUrl.startsWith('/generated-audio/tts_')) {
        const fragmentPath = path.join(process.cwd(), 'public', segment.audioUrl);
        try {
          if (fs.existsSync(fragmentPath)) {
            fs.unlinkSync(fragmentPath);
            fragmentsDeleted++;
          }
        } catch (cleanErr) {
          console.warn(`⚠️ No se pudo eliminar fragmento: ${segment.audioUrl}`, cleanErr);
        }
      }
    }
    console.log(`✅ Eliminados ${fragmentsDeleted} fragmentos TTS`);

    // 5.2 Mover archivo final a carpeta del usuario
    // ✅ FIX: Usar userEmail de la sesión (obtenido al inicio) en vez de getCurrentUser()
    let finalAudioUrl = assemblyResult.audioUrl;
    let finalLocalPath = assemblyResult.s3Key;

    if (userEmail) {
      const userFolder = userEmail.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 50);
      const userNoticieroDir = path.join(process.cwd(), 'public', 'audio', userFolder, 'noticieros');

      // Crear directorio si no existe
      if (!fs.existsSync(userNoticieroDir)) {
        fs.mkdirSync(userNoticieroDir, { recursive: true });
        console.log(`📁 Carpeta creada: ${userNoticieroDir}`);
      }

      // Mover archivo
      const originalPath = assemblyResult.s3Key;
      const fileName = path.basename(originalPath as string);
      const newPath = path.join(userNoticieroDir, fileName);

      try {
        if (originalPath && fs.existsSync(originalPath)) {
          fs.copyFileSync(originalPath, newPath);
          fs.unlinkSync(originalPath); // Eliminar original
          finalAudioUrl = `/audio/${userFolder}/noticieros/${fileName}`;
          finalLocalPath = newPath;
          console.log(`📦 Noticiero movido a carpeta de usuario: ${finalAudioUrl}`);
        }
      } catch (moveErr) {
        console.warn('⚠️ No se pudo mover a carpeta de usuario, manteniendo ubicación original', moveErr);
      }
    }

    // 6. Actualizar el noticiero en la base de datos
    console.log('💾 Actualizando base de datos...');
    const { error: updateError } = await supabase
      .from('noticieros')
      .update({
        url_audio: finalAudioUrl,
        s3_key: finalLocalPath,
        duracion_segundos: assemblyResult.duration,
        estado: 'completado',
        updated_at: new Date().toISOString()
      })
      .eq('id', targetId);

    if (updateError) {
      console.error('Error actualizando noticiero:', updateError);
      return NextResponse.json(
        { error: 'Error actualizando noticiero en base de datos' },
        { status: 500 }
      );
    }

    // 7. Registrar log de procesamiento
    await supabase.from('logs_procesamiento').insert({
      user_id: userId,
      noticiero_id: targetId,
      tipo_proceso: 'ensamblaje',
      estado: 'completado',
      inicio: new Date().toISOString(),
      fin: new Date().toISOString(),
      duracion_segundos: assemblyResult.duration,
      metadata: {
        segments_count: segments.length,
        include_music: includeMusic,
        include_fx: includeFx,
        final_duration: assemblyResult.duration,
        fragments_deleted: fragmentsDeleted
      }
    });

    console.log('✅ Noticiero finalizado exitosamente');

    return NextResponse.json({
      success: true,
      audioUrl: finalAudioUrl,
      localPath: finalLocalPath,
      duration: assemblyResult.duration,
      segmentsCount: segments.length,
      fragmentsDeleted: fragmentsDeleted,
      message: 'Noticiero ensamblado y finalizado exitosamente'
    });

  } catch (error) {
    console.error('Error fatal en finalización de noticiero:', error);

    // Registrar error en logs
    try {
      const session = await getSupabaseSession();
      const userId = session?.user?.id || 'unknown';

      await supabase.from('logs_procesamiento').insert({
        user_id: userId !== 'unknown' ? userId : undefined, // Solo insertar si es UUID válido
        tipo_proceso: 'ensamblaje',
        estado: 'fallido',
        mensaje_error: error instanceof Error ? error.message : 'Error desconocido',
        metadata: { error: String(error) }
      });
    } catch (logError) {
      console.error('Error registrando log:', logError);
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
