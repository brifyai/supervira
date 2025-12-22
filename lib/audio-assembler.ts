import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Directorio para almacenar archivos de audio generados
const AUDIO_STORAGE_DIR = path.join(process.cwd(), 'public', 'generated-audio');

// Asegurar que el directorio existe
if (!fs.existsSync(AUDIO_STORAGE_DIR)) {
    fs.mkdirSync(AUDIO_STORAGE_DIR, { recursive: true });
}

// Configurar FFmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AudioSegment {
    id: string;
    audioUrl: string;
    duration: number;
    fadeIn?: number;
    fadeOut?: number;
    volume?: number;
    type?: 'intro' | 'news' | 'advertisement' | 'outro' | 'music' | 'fx';
}

interface AssemblyOptions {
    includeMusic?: boolean;
    includeFx?: boolean;
    outputFormat?: 'mp3' | 'wav';
    normalizeAudio?: boolean;
    backgroundMusicUrl?: string;
    backgroundMusicVolume?: number;
    backgroundMusicConfig?: {
        mode: 'global' | 'range';
        fromNews?: number;
        toNews?: number;
    } | null;
}

interface AssemblyResult {
    success: boolean;
    audioUrl?: string;
    s3Key?: string;
    duration?: number;
    error?: string;
}

/**
 * Descarga un archivo de audio desde una URL
 */
async function downloadAudio(url: string, filename: string): Promise<string> {
    const tempPath = path.join(os.tmpdir(), filename);

    // Si es una URL relativa (local), copiar desde public/
    if (url.startsWith('/')) {
        const localPath = path.join(process.cwd(), 'public', url);
        if (fs.existsSync(localPath)) {
            await fs.promises.copyFile(localPath, tempPath);
            return tempPath;
        } else {
            throw new Error(`Local audio file not found: ${localPath}`);
        }
    }

    // Si es URL remota, descargar
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download audio from ${url}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await fs.promises.writeFile(tempPath, Buffer.from(buffer));
    return tempPath;
}

/**
 * Aplica efectos de audio (fade in/out, volumen) a un archivo
 */
function applyAudioEffects(
    inputPath: string,
    outputPath: string,
    options: {
        fadeIn?: number;
        fadeOut?: number;
        volume?: number;
        duration?: number;
    }
): Promise<void> {
    return new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath);

        const filters: string[] = [];

        // Fade in
        if (options.fadeIn && options.fadeIn > 0) {
            filters.push(`afade=t=in:st=0:d=${options.fadeIn}`);
        }

        // Fade out
        if (options.fadeOut && options.fadeOut > 0 && options.duration) {
            const fadeOutStart = Math.max(0, options.duration - options.fadeOut);
            filters.push(`afade=t=out:st=${fadeOutStart}:d=${options.fadeOut}`);
        }

        // Volumen
        if (options.volume !== undefined && options.volume !== 1.0) {
            filters.push(`volume=${options.volume}`);
        }

        if (filters.length > 0) {
            command = command.audioFilters(filters.join(','));
        }

        command
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
}

/**
 * Concatena múltiples archivos de audio usando Crossfade para transiciones suaves
 * Incluye silencio entre segmentos para mejor separación
 */
function concatenateAudio(inputPaths: string[], outputPath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        // Si solo hay un archivo, simplemente copiarlo (o convertirlo)
        if (inputPaths.length === 1) {
            ffmpeg(inputPaths[0])
                .output(outputPath)
                .audioBitrate('256k') // Alta calidad
                .audioFrequency(24000) // Mantener sample rate de F5-TTS
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
            return;
        }

        // Pre-procesar: agregar silencio al final de cada segmento para crear pausas
        const paddedPaths: string[] = [];
        const silenceGap = 1.5; // 1.5 segundos de silencio entre noticias (aumentado)

        console.log(`🔇 Agregando ${silenceGap}s de silencio entre segmentos...`);

        for (let i = 0; i < inputPaths.length; i++) {
            const paddedPath = path.join(os.tmpdir(), `padded_${i}_${Date.now()}.mp3`);

            try {
                await addSilenceToEnd(inputPaths[i], paddedPath, silenceGap);
                paddedPaths.push(paddedPath);
            } catch (err) {
                console.warn(`⚠️ No se pudo agregar silencio al segmento ${i}, usando original`);
                paddedPaths.push(inputPaths[i]);
            }
        }

        // Usar concatenación simple (sin crossfade) para mantener las pausas intactas
        console.log(`🔗 Concatenando ${paddedPaths.length} segmentos (sin crossfade)...`);

        const command = ffmpeg();
        paddedPaths.forEach(p => command.input(p));

        // Filtro de concatenación simple - sin crossfade para mantener silencios
        const filter = paddedPaths.map((_, i) => `[${i}:a]`).join('') + `concat=n=${paddedPaths.length}:v=0:a=1[out]`;

        command
            .complexFilter(filter)
            .outputOptions(['-map', '[out]'])
            .audioBitrate('256k') // Alta calidad
            .audioFrequency(24000) // Mantener sample rate de F5-TTS
            .output(outputPath)
            .on('end', () => {
                // Limpiar archivos padded temporales
                paddedPaths.forEach(p => {
                    if (p.includes('padded_') && fs.existsSync(p)) {
                        try { fs.unlinkSync(p); } catch (e) { }
                    }
                });
                resolve();
            })
            .on('error', (err: Error) => {
                console.error("Error en concatenación:", err);
                // Intentar fallback sin padding
                fallbackConcatenate(inputPaths, outputPath).then(resolve).catch(reject);
            })
            .run();
    });
}

/**
 * Agrega silencio al final de un archivo de audio
 * Usa adelay para crear padding al final (más compatible que apad)
 */
function addSilenceToEnd(inputPath: string, outputPath: string, silenceDuration: number): Promise<void> {
    return new Promise((resolve, reject) => {
        // Usamos apad con whole_dur que es más compatible
        // Primero obtenemos la duración del audio y luego extendemos
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }

            const currentDuration = metadata.format.duration || 0;
            const targetDuration = currentDuration + silenceDuration;

            ffmpeg(inputPath)
                .audioFilters(`apad=whole_dur=${targetDuration}`)
                .audioFrequency(24000) // Mantener sample rate
                .output(outputPath)
                .on('end', () => resolve())
                .on('error', (err: Error) => reject(err))
                .run();
        });
    });
}

/**
 * Fallback: Concatenación simple si falla el crossfade
 */
function fallbackConcatenate(inputPaths: string[], outputPath: string): Promise<void> {
    console.log("⚠️ Usando concatenación simple (fallback)...");
    return new Promise((resolve, reject) => {
        const command = ffmpeg();
        inputPaths.forEach(p => command.input(p));
        const filter = inputPaths.map((_, i) => `[${i}:a]`).join('') + `concat=n=${inputPaths.length}:v=0:a=1[out]`;

        command
            .complexFilter(filter)
            .outputOptions(['-map', '[out]'])
            .audioBitrate('256k')
            .audioFrequency(24000)
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', reject)
            .run();
    });
}

/**
 * Mezcla audio principal con música de fondo
 */
function mixWithBackgroundMusic(
    mainAudioPath: string,
    musicPath: string,
    outputPath: string,
    musicVolume: number = 0.2
): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(mainAudioPath)
            .input(musicPath)
            .complexFilter([
                `[1:a]volume=${musicVolume}[music]`,
                '[0:a][music]amix=inputs=2:duration=first:dropout_transition=2[out]'
            ])
            .outputOptions(['-map', '[out]'])
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
}

/**
 * Mezcla audio principal con música de fondo solo en un rango específico
 * La música tiene fade in/out de 2 segundos en los límites del rango
 */
function mixWithBackgroundMusicRange(
    mainAudioPath: string,
    musicPath: string,
    outputPath: string,
    musicVolume: number = 0.2,
    startTime: number,
    rangeDuration: number
): Promise<void> {
    return new Promise((resolve, reject) => {
        const fadeTime = 2; // 2 segundos de fade in/out

        // Filtro complex para:
        // 1. Cortar la música a la duración del rango (con loop si es necesario)
        // 2. Aplicar fade in/out
        // 3. Aplicar volumen
        // 4. Delay para que empiece en el punto correcto
        // 5. Mezclar con el audio principal
        ffmpeg()
            .input(mainAudioPath)
            .input(musicPath)
            .complexFilter([
                // Preparar música: loop si es necesario, cortar a duración, aplicar fades y volumen
                `[1:a]aloop=loop=-1:size=2e+09,atrim=0:${rangeDuration},afade=t=in:st=0:d=${fadeTime},afade=t=out:st=${rangeDuration - fadeTime}:d=${fadeTime},volume=${musicVolume}[music]`,
                // Delay la música para que empiece en startTime
                `[music]adelay=${Math.round(startTime * 1000)}|${Math.round(startTime * 1000)}[musicdelayed]`,
                // Mezclar ambas pistas
                '[0:a][musicdelayed]amix=inputs=2:duration=first:dropout_transition=2[out]'
            ])
            .outputOptions(['-map', '[out]'])
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err) => {
                console.error('Error en mixWithBackgroundMusicRange:', err);
                reject(err);
            })
            .run();
    });
}

/**
 * Normaliza el audio para tener un volumen consistente
 */
function normalizeAudio(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Tuned normalization:
        // I=-23 (Broadcast standard, quieter background)
        // TP=-2.0 (True Peak limit)
        // LRA=7 (Lower dynamic range for consistency)
        // measured_thresh=-30 (Ignore silence/noise floor)
        ffmpeg(inputPath)
            .audioFilters('loudnorm=I=-23:TP=-2.0:LRA=7:measured_thresh=-30')
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
}

/**
 * Obtiene la duración de un archivo de audio
 */
function getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                resolve(metadata.format.duration || 0);
            }
        });
    });
}

/**
 * Limpia archivos temporales
 */
async function cleanupTempFiles(files: string[]): Promise<void> {
    for (const file of files) {
        try {
            if (fs.existsSync(file)) {
                await fs.promises.unlink(file);
            }
        } catch (error) {
            console.warn(`Failed to delete temp file ${file}:`, error);
        }
    }
}

/**
 * Ensambla un noticiero completo a partir de múltiples segmentos de audio
 */
/**
 * Ajusta la duración del audio usando el filtro atempo de FFmpeg (Elastic Audio)
 */
/**
 * Ajusta la duración del audio usando "Smart Assembly" (Elastic Silence)
 * En lugar de estirar la voz, agrega silencios o recorta espacios.
 */
async function adjustAudioDuration(
    inputPath: string,
    outputPath: string,
    currentDuration: number,
    targetDuration: number
): Promise<void> {
    return new Promise((resolve, reject) => {
        const diff = targetDuration - currentDuration;

        console.log(`🎚️ Smart Assembly: Actual=${currentDuration.toFixed(2)}s, Target=${targetDuration.toFixed(2)}s, Diff=${diff.toFixed(2)}s`);

        if (Math.abs(diff) < 1.0) {
            // Diferencia despreciable, solo copiar
            console.log("✅ Diferencia mínima, copiando archivo original.");
            fs.copyFileSync(inputPath, outputPath);
            resolve();
            return;
        }

        if (diff > 0) {
            // CASO 1: FALTA TIEMPO (Audio muy corto) -> Agregar silencio/música al final
            // Esto es lo ideal para mantener calidad de voz.
            console.log(`➕ Agregando ${diff.toFixed(2)}s de silencio/padding al final...`);

            // Generar silencio
            const silenceFilter = `anullsrc=r=24000:cl=mono:d=${diff}[silence];[0:a][silence]concat=n=2:v=0:a=1[out]`;

            ffmpeg(inputPath)
                .complexFilter(silenceFilter)
                .outputOptions(['-map', '[out]'])
                .output(outputPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();

        } else {
            // CASO 2: SOBRA TIEMPO (Audio muy largo) -> Acelerar LIGERAMENTE (max 5%)
            // Si necesitamos recortar más del 5%, es mejor cortar el final que destruir la voz.

            const ratio = currentDuration / targetDuration;
            let speed = ratio;

            // Limitar aceleración al 5% (1.05x) para evitar efecto "ardilla"
            if (speed > 1.05) {
                console.warn(`⚠️ Se requiere acelerar ${((speed - 1) * 100).toFixed(1)}%. Limitando a 5% para proteger calidad.`);
                speed = 1.05;
            }

            console.log(`⏩ Acelerando audio x${speed.toFixed(3)}...`);

            ffmpeg(inputPath)
                .audioFilters(`atempo=${speed}`)
                .output(outputPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        }
    });
}

/**
 * Ensambla un noticiero completo a partir de múltiples segmentos de audio
 */
export async function assembleNewscast(
    segments: AudioSegment[],
    options: AssemblyOptions & { targetDuration?: number; forceExactDuration?: boolean } = {}
): Promise<AssemblyResult> {
    const tempFiles: string[] = [];

    try {
        console.log(`🎬 Iniciando ensamblaje de ${segments.length} segmentos de audio...`);

        // 1. Descargar todos los segmentos
        const downloadedSegments: string[] = [];

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            console.log(`📥 Descargando segmento ${i + 1}/${segments.length}: ${segment.id}`);

            const filename = `segment_${i}_${segment.id}.mp3`;
            const downloadedPath = await downloadAudio(segment.audioUrl, filename);
            tempFiles.push(downloadedPath);

            // 2. Aplicar efectos si es necesario
            if (segment.fadeIn || segment.fadeOut || segment.volume) {
                const processedPath = path.join(os.tmpdir(), `processed_${filename}`);

                await applyAudioEffects(downloadedPath, processedPath, {
                    fadeIn: segment.fadeIn,
                    fadeOut: segment.fadeOut,
                    volume: segment.volume,
                    duration: segment.duration
                });

                tempFiles.push(processedPath);
                downloadedSegments.push(processedPath);
            } else {
                downloadedSegments.push(downloadedPath);
            }
        }

        // 3. Concatenar todos los segmentos
        const concatenatedPath = path.join(os.tmpdir(), `concatenated_${Date.now()}.mp3`);
        tempFiles.push(concatenatedPath);

        console.log('🔗 Concatenando segmentos...');
        await concatenateAudio(downloadedSegments, concatenatedPath);

        let finalPath = concatenatedPath;

        // 4. Mezclar con música de fondo si se solicita
        if (options.includeMusic && options.backgroundMusicUrl) {
            const musicConfig = options.backgroundMusicConfig;
            const mode = musicConfig?.mode || 'global';

            console.log(`🎵 Agregando música de fondo (modo: ${mode})...`);

            const musicPath = await downloadAudio(
                options.backgroundMusicUrl,
                `background_music_${Date.now()}.mp3`
            );
            tempFiles.push(musicPath);

            const mixedPath = path.join(os.tmpdir(), `mixed_${Date.now()}.mp3`);
            tempFiles.push(mixedPath);

            if (mode === 'range' && musicConfig?.fromNews !== undefined && musicConfig?.toNews !== undefined) {
                // Modo rango: calcular tiempos de inicio/fin basados en los segmentos
                const fromIndex = musicConfig.fromNews - 1; // Convertir a índice 0-based
                const toIndex = musicConfig.toNews - 1;

                // Calcular tiempo de inicio y duración
                let startTime = 0;
                let endTime = 0;

                // Sumar duraciones de segmentos anteriores al rango para obtener startTime
                for (let i = 0; i < segments.length; i++) {
                    if (i < fromIndex) {
                        startTime += segments[i].duration || 0;
                    }
                    if (i <= toIndex) {
                        endTime = startTime + (segments[i].duration || 0);
                        if (i >= fromIndex) {
                            endTime += segments[i].duration || 0;
                        }
                    }
                }

                // Recalcular endTime correctamente
                endTime = 0;
                for (let i = 0; i <= toIndex && i < segments.length; i++) {
                    endTime += segments[i].duration || 0;
                }

                const rangeDuration = endTime - startTime;
                console.log(`   Rango: noticias ${musicConfig.fromNews}-${musicConfig.toNews} (${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s, duración: ${rangeDuration.toFixed(1)}s)`);

                // Para modo rango, usamos un filtro ffmpeg más complejo
                await mixWithBackgroundMusicRange(
                    concatenatedPath,
                    musicPath,
                    mixedPath,
                    options.backgroundMusicVolume || 0.2,
                    startTime,
                    rangeDuration
                );
            } else {
                // Modo global: música en todo el audio (comportamiento actual)
                await mixWithBackgroundMusic(
                    concatenatedPath,
                    musicPath,
                    mixedPath,
                    options.backgroundMusicVolume || 0.2
                );
            }

            finalPath = mixedPath;
        }

        // 5. Normalizar audio si se solicita
        if (options.normalizeAudio !== false) {
            console.log('🔊 Normalizando audio...');
            const normalizedPath = path.join(os.tmpdir(), `normalized_${Date.now()}.mp3`);
            tempFiles.push(normalizedPath);

            await normalizeAudio(finalPath, normalizedPath);
            finalPath = normalizedPath;
        }

        // 6. Obtener duración actual
        let duration = await getAudioDuration(finalPath);
        console.log(`⏱️ Duración pre-ajuste: ${duration.toFixed(2)}s`);

        // 7. ELASTIC AUDIO: Ajustar duración exacta si se solicita
        if (options.forceExactDuration && options.targetDuration) {
            const diff = Math.abs(duration - options.targetDuration);
            const tolerance = 5; // 5 segundos de tolerancia

            if (diff > tolerance) {
                console.log(`📏 Ajustando duración exacta a ${options.targetDuration}s (Diferencia: ${diff.toFixed(2)}s)...`);
                const adjustedPath = path.join(os.tmpdir(), `adjusted_${Date.now()}.mp3`);
                tempFiles.push(adjustedPath);

                try {
                    await adjustAudioDuration(finalPath, adjustedPath, duration, options.targetDuration);
                    finalPath = adjustedPath;
                    duration = await getAudioDuration(finalPath); // Actualizar duración final
                    console.log(`✅ Duración ajustada a: ${duration.toFixed(2)}s`);
                } catch (err) {
                    console.error("❌ Error aplicando Elastic Audio:", err);
                    // Si falla, seguimos con el audio original pero avisamos
                }
            } else {
                console.log(`✅ La duración actual (${duration.toFixed(2)}s) está dentro de la tolerancia del objetivo (${options.targetDuration}s).`);
            }
        }

        // 8. Guardar archivo final en el servidor
        console.log('💾 Guardando archivo final...');
        const finalFileName = `noticiero_${Date.now()}.mp3`;
        const finalStoragePath = path.join(AUDIO_STORAGE_DIR, finalFileName);

        // Copiar archivo final a la ubicación permanente
        await fs.promises.copyFile(finalPath, finalStoragePath);

        // Generar URL pública (accesible desde /generated-audio/...)
        const audioUrl = `/generated-audio/${finalFileName}`;
        const localPath = finalStoragePath;

        // 9. Limpiar archivos temporales
        console.log('🧹 Limpiando archivos temporales...');
        await cleanupTempFiles(tempFiles);

        console.log('✅ Ensamblaje completado exitosamente');

        return {
            success: true,
            audioUrl,
            s3Key: localPath, // Guardamos la ruta local en lugar de s3Key
            duration: Math.round(duration)
        };

    } catch (error) {
        console.error('❌ Error en ensamblaje de audio:', error);

        // Intentar limpiar archivos temporales incluso si hay error
        await cleanupTempFiles(tempFiles);

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Obtiene los segmentos de audio de un noticiero desde la base de datos
 */
export async function getNewscastSegments(noticieroId: string): Promise<AudioSegment[]> {
    const { data: noticiero, error } = await supabase
        .from('noticieros')
        .select('datos_timeline')
        .eq('id', noticieroId)
        .single();

    if (error || !noticiero) {
        throw new Error(`Noticiero no encontrado: ${noticieroId}`);
    }

    const timeline = noticiero.datos_timeline;
    if (!Array.isArray(timeline)) {
        throw new Error('Timeline inválido');
    }

    // Filtrar solo los segmentos que tienen audio
    const segments: AudioSegment[] = timeline
        .filter((item: any) => item.audioUrl)
        .map((item: any) => ({
            id: item.id,
            audioUrl: item.audioUrl,
            duration: item.duration || 0,
            fadeIn: item.fadeIn,
            fadeOut: item.fadeOut,
            volume: item.volume || 1.0,
            type: item.type
        }));

    return segments;
}
