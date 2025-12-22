
import { NextRequest, NextResponse } from 'next/server'
import { downloadFile, fileExists, getDownloadUrl } from '@/lib/s3'
import { validateS3Config } from '@/lib/aws-config'

// Cache en memoria para archivos pequeños (opcional)
const fileCache = new Map<string, {
  buffer: Buffer
  contentType: string
  filename: string
  cachedAt: Date
}>()

// TTL del cache en milisegundos (5 minutos)
const CACHE_TTL = 5 * 60 * 1000

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = decodeURIComponent(params.fileId)
    
    console.log(`Download request for file: ${fileId}`)
    
    // Validar fileId
    if (!fileId || fileId.length < 10) {
      return NextResponse.json(
        { error: 'ID de archivo inválido' },
        { status: 400 }
      )
    }
    
    // Verificar configuración S3
    const s3Config = validateS3Config()
    if (!s3Config.isValid) {
      console.warn('S3 not configured, falling back to signed URL redirect')
      // Si S3 no está configurado, generar una respuesta de error apropiada
      return NextResponse.json(
        { 
          error: 'Servicio de archivos no disponible',
          details: 'Configuración de almacenamiento pendiente',
          missingConfig: s3Config.missing
        },
        { status: 503 }
      )
    }

    // Verificar cache primero
    const cached = fileCache.get(fileId)
    if (cached && (Date.now() - cached.cachedAt.getTime()) < CACHE_TTL) {
      console.log(`Serving from cache: ${fileId}`)
      
      const headers = new Headers({
        'Content-Type': cached.contentType,
        'Content-Disposition': `attachment; filename="${cached.filename}"`,
        'Content-Length': cached.buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'HIT',
        'X-File-Id': fileId
      })
      
      return new NextResponse(cached.buffer, { status: 200, headers })
    }

    // Verificar si el archivo existe en S3
    const exists = await fileExists(fileId)
    if (!exists) {
      console.log(`File not found in S3: ${fileId}`)
      return NextResponse.json(
        { error: 'Archivo no encontrado o expirado' },
        { status: 404 }
      )
    }

    // Estrategia de descarga: usar URL firmada para archivos grandes, descarga directa para pequeños
    const { searchParams } = new URL(request.url)
    const directDownload = searchParams.get('direct') === 'true'
    
    if (!directDownload) {
      // Generar URL firmada y redirigir (más eficiente para archivos grandes)
      try {
        const signedUrl = await getDownloadUrl(fileId, 300) // 5 minutos de validez
        console.log(`Redirecting to signed URL for: ${fileId}`)
        
        return NextResponse.redirect(signedUrl, { status: 302 })
      } catch (error) {
        console.warn('Failed to generate signed URL, falling back to direct download:', error)
      }
    }

    // Descarga directa a través del servidor (para archivos pequeños o si falla la URL firmada)
    console.log(`Direct download for: ${fileId}`)
    const audioBuffer = await downloadFile(fileId)
    
    // Determinar tipo de contenido y nombre de archivo
    const contentType = getContentType(fileId)
    const filename = getFilename(fileId)
    
    // Cachear archivos pequeños (< 10MB)
    if (audioBuffer.length < 10 * 1024 * 1024) {
      fileCache.set(fileId, {
        buffer: audioBuffer,
        contentType,
        filename,
        cachedAt: new Date()
      })
      
      // Limpiar cache viejo
      cleanupCache()
    }
    
    // Headers para descarga
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': audioBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
      'X-Cache': 'MISS',
      'X-File-Id': fileId,
      'X-Download-Method': 'direct'
    })
    
    console.log(`Download completed: ${fileId}, ${audioBuffer.length} bytes`)
    
    return new NextResponse(audioBuffer, {
      status: 200,
      headers
    })
    
  } catch (error) {
    console.error('Download API Error:', error)
    
    // Diferentes tipos de error
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('404')) {
        return NextResponse.json(
          { error: 'Archivo no encontrado' },
          { status: 404 }
        )
      }
      if (error.message.includes('forbidden') || error.message.includes('403')) {
        return NextResponse.json(
          { error: 'Acceso denegado al archivo' },
          { status: 403 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Error al descargar el archivo',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

// Función auxiliar para determinar tipo de contenido
function getContentType(fileId: string): string {
  const extension = fileId.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'mp3':
      return 'audio/mpeg'
    case 'wav':
      return 'audio/wav'
    case 'ogg':
      return 'audio/ogg'
    case 'm4a':
      return 'audio/mp4'
    default:
      return 'audio/mpeg' // Default to MP3
  }
}

// Función auxiliar para generar nombre de archivo amigable
function getFilename(fileId: string): string {
  // Si el fileId ya incluye un nombre de archivo, usarlo
  if (fileId.includes('/')) {
    const parts = fileId.split('/')
    const filename = parts[parts.length - 1]
    if (filename.includes('.')) {
      return filename
    }
  }
  
  // Generar nombre basado en la fecha
  const today = new Date().toISOString().split('T')[0]
  const extension = getExtensionFromFileId(fileId)
  return `noticiero_${today}.${extension}`
}

// Función auxiliar para extraer extensión del fileId
function getExtensionFromFileId(fileId: string): string {
  const extension = fileId.split('.').pop()?.toLowerCase()
  return ['mp3', 'wav', 'ogg', 'm4a'].includes(extension || '') ? extension! : 'mp3'
}

// Función para limpiar cache viejo
function cleanupCache() {
  const now = Date.now()
  for (const [key, value] of fileCache.entries()) {
    if (now - value.cachedAt.getTime() > CACHE_TTL) {
      fileCache.delete(key)
    }
  }
}

// Endpoint para obtener información del archivo sin descargarlo
export async function HEAD(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = decodeURIComponent(params.fileId)
    
    // Verificar configuración S3
    const s3Config = validateS3Config()
    if (!s3Config.isValid) {
      return new NextResponse(null, { status: 503 })
    }

    // Verificar si el archivo existe en S3
    const exists = await fileExists(fileId)
    if (!exists) {
      return new NextResponse(null, { status: 404 })
    }
    
    const headers = new Headers({
      'Content-Type': getContentType(fileId),
      'Last-Modified': new Date().toUTCString(), // En un sistema real, usarías la fecha real del archivo
      'X-File-Id': fileId,
      'X-File-Status': 'available'
    })
    
    return new NextResponse(null, {
      status: 200,
      headers
    })
    
  } catch (error) {
    return new NextResponse(null, { status: 500 })
  }
}
