
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand 
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { createS3Client, getBucketConfig } from './aws-config'

const s3Client = createS3Client()
const bucketConfig = getBucketConfig()

// Subir archivo a S3
export async function uploadFile(buffer: Buffer, fileName: string, contentType: string = 'audio/mpeg'): Promise<string> {
  try {
    const key = `${bucketConfig.folderPrefix}${fileName}`
    
    const command = new PutObjectCommand({
      Bucket: bucketConfig.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'private', // Archivos privados, acceso por signed URLs
      Metadata: {
        'uploaded-by': 'vira-system',
        'upload-time': new Date().toISOString()
      }
    })

    await s3Client.send(command)
    
    // Retornar la key completa para referencia
    return key
  } catch (error) {
    console.error('Error uploading to S3:', error)
    throw new Error(`Error subiendo archivo a S3: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

// Generar URL firmada para descarga
export async function getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketConfig.bucketName,
      Key: key
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })
    return signedUrl
  } catch (error) {
    console.error('Error generating signed URL:', error)
    throw new Error(`Error generando URL de descarga: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

// Descargar archivo desde S3
export async function downloadFile(key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketConfig.bucketName,
      Key: key
    })

    const response = await s3Client.send(command)
    
    if (!response.Body) {
      throw new Error('Archivo no encontrado')
    }

    // Convertir el stream a buffer
    const chunks: Uint8Array[] = []
    const stream = response.Body as any
    
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    
    return Buffer.concat(chunks)
  } catch (error) {
    console.error('Error downloading from S3:', error)
    throw new Error(`Error descargando archivo desde S3: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

// Eliminar archivo de S3
export async function deleteFile(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketConfig.bucketName,
      Key: key
    })

    await s3Client.send(command)
  } catch (error) {
    console.error('Error deleting from S3:', error)
    throw new Error(`Error eliminando archivo de S3: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

// Verificar si un archivo existe
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketConfig.bucketName,
      Key: key
    })

    await s3Client.send(command)
    return true
  } catch (error) {
    return false
  }
}

// Generar nombre único para archivo
export function generateUniqueFileName(originalName: string, prefix: string = ''): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  const extension = originalName.split('.').pop() || 'mp3'
  
  return `${prefix}${timestamp}_${random}.${extension}`
}
