
import 'server-only';

import { S3Client } from "@aws-sdk/client-s3"

// Configuración del bucket S3
export function getBucketConfig() {
  return {
    bucketName: process.env.AWS_BUCKET_NAME || 'vira-audio-files',
    folderPrefix: process.env.AWS_FOLDER_PREFIX || 'production/',
    cdnUrl: process.env.S3_CDN_URL || '',
    region: process.env.AWS_REGION || 'us-east-1'
  }
}

// Cliente S3 configurado
export function createS3Client() {
  const config = {
    region: process.env.AWS_REGION || 'us-east-1',
  }

  // Solo agregar credenciales si están disponibles
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    Object.assign(config, {
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    })
  }

  return new S3Client(config)
}

// Validar configuración S3
export function validateS3Config(): { isValid: boolean; missing: string[] } {
  const required = [
    'AWS_BUCKET_NAME',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION'
  ]

  const missing = required.filter(key => !process.env[key])

  return {
    isValid: missing.length === 0,
    missing
  }
}
