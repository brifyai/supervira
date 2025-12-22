import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getSupabaseSession, supabaseAdmin } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/supabase-auth'
import { getResourceOwnerId, canModifyResources } from '@/lib/resource-owner'

const supabase = supabaseAdmin

// Directorio base para archivos de audio
const AUDIO_BASE_DIR = path.join(process.cwd(), 'public', 'audio')

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo ADMIN puede subir archivos, USER no puede (usa recursos del admin)
    if (!canModifyResources(currentUser)) {
      return NextResponse.json({
        error: 'No tienes permisos para subir archivos. Contacta a tu administrador.'
      }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const nombre = (formData.get('nombre') as string) || (formData.get('type') as string)
    const tipo = (formData.get('tipo') as string) || 'musica'
    const descripcion = (formData.get('descripcion') as string) || ''
    const isGlobal = formData.get('global') === 'true'

    // Soportar campo legacy 'type' y 'itemId'
    const legacyType = formData.get('type') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json({
        error: 'Tipo de archivo no permitido. Solo se aceptan archivos de audio.'
      }, { status: 400 })
    }

    // Validar tamaño del archivo (máximo 50MB para música)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'Archivo demasiado grande. Máximo 50MB permitido.'
      }, { status: 400 })
    }

    // Obtener el owner_id correcto (para registrar en BD)
    const resourceOwnerId = getResourceOwnerId(currentUser as any)
    const userEmail = currentUser.email

    // Sanitizar email para usarlo como nombre de carpeta
    const userFolder = userEmail
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase()
      .substring(0, 50)

    // Mapear tipo a nombre de subcarpeta
    const tipoToFolder: Record<string, string> = {
      'cortina': 'cortinas',
      'musica': 'musica',
      'efecto': 'efectos',
      'jingle': 'jingles',
      'intro': 'intros',
      'outro': 'outros',
      'voz': 'voces',
      'publicidad': 'publicidad'
    }
    const tipoFolder = tipoToFolder[tipo] || 'otros'

    // Determinar carpeta destino: usuario/tipo/ o global/tipo/
    const baseFolder = isGlobal ? 'global' : userFolder
    const targetFolder = `${baseFolder}/${tipoFolder}`
    const userAudioDir = path.join(AUDIO_BASE_DIR, baseFolder, tipoFolder)

    // Crear directorio si no existe
    if (!existsSync(userAudioDir)) {
      await mkdir(userAudioDir, { recursive: true })
      console.log(`📁 Carpeta creada: ${userAudioDir}`)
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'mp3'
    const sanitizedName = (nombre || file.name.replace(/\.[^/.]+$/, ''))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 100)
    const uniqueFileName = `${timestamp}_${sanitizedName}.${extension}`
    const filepath = path.join(userAudioDir, uniqueFileName)

    // Leer el archivo y guardarlo
    const bytes = await file.arrayBuffer()
    const buffer = new Uint8Array(bytes)
    await writeFile(filepath, buffer)
    console.log(`✅ Archivo guardado: ${filepath}`)

    // URL pública del archivo
    const audioUrl = `/audio/${targetFolder}/${uniqueFileName}`

    // Calcular duración aproximada (por tamaño, ~128kbps)
    const fileSizeKB = buffer.length / 1024
    const estimatedDurationSec = Math.round((fileSizeKB * 8) / 128)
    const durationMinutes = Math.floor(estimatedDurationSec / 60)
    const durationSeconds = estimatedDurationSec % 60
    const duracionStr = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`

    // Guardar registro en la base de datos
    const { data: insertData, error: insertError } = await supabase
      .from('biblioteca_audio')
      .insert([{
        nombre: nombre || file.name.replace(/\.[^/.]+$/, ''),
        audio: audioUrl,
        tipo: tipo,
        descripcion: descripcion,
        duracion: duracionStr,
        duration_seconds: estimatedDurationSec,
        user_id: isGlobal ? null : resourceOwnerId,  // ✅ Usar owner correcto para multi-tenant
        is_active: true
      }])
      .select()

    if (insertError) {
      console.error('Error al insertar en BD:', insertError)
      return NextResponse.json({ error: 'Error al guardar en base de datos' }, { status: 500 })
    }

    console.log(`✅ Audio subido: ${uniqueFileName} (${tipo}) para ${isGlobal ? 'todos' : userEmail}`)

    return NextResponse.json({
      success: true,
      message: 'Archivo subido exitosamente',
      data: insertData[0],
      audioUrl,
      fileName: uniqueFileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
      folder: targetFolder,
      s3Key: `local/audio/${targetFolder}/${uniqueFileName}`,
      uploadedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error en upload-audio:', error)
    return NextResponse.json({
      error: 'Error interno del servidor al subir el audio',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
