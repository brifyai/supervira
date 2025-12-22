/**
 * Google Drive API Client
 * Permite subir/descargar archivos al Drive del usuario
 */

import { google } from 'googleapis'
import { Readable } from 'stream'

// Configuración OAuth2
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
)

// Scopes necesarios para Drive
export const GOOGLE_DRIVE_SCOPES = [
    'https://www.googleapis.com/auth/drive.file', // Crear/editar archivos que la app crea
    'https://www.googleapis.com/auth/userinfo.email', // Email del usuario
]

/**
 * Genera la URL de autorización de Google
 */
export function getGoogleAuthUrl(state?: string): string {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Para obtener refresh_token
        scope: GOOGLE_DRIVE_SCOPES,
        prompt: 'consent', // Forzar consent para refresh_token
        state: state || '', // Para pasar datos al callback
    })
}

/**
 * Intercambia el código de autorización por tokens
 */
export async function getTokensFromCode(code: string): Promise<{
    access_token: string
    refresh_token: string | null
    expiry_date: number | null
}> {
    const { tokens } = await oauth2Client.getToken(code)
    return {
        access_token: tokens.access_token || '',
        refresh_token: tokens.refresh_token || null,
        expiry_date: tokens.expiry_date || null,
    }
}

/**
 * Crea un cliente de Drive autenticado con el refresh token del usuario
 */
export function getDriveClient(refreshToken: string) {
    const authClient = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    )
    authClient.setCredentials({ refresh_token: refreshToken })
    return google.drive({ version: 'v3', auth: authClient })
}

/**
 * Obtiene o crea la carpeta VIRA en el Drive del usuario
 */
export async function getOrCreateViraFolder(refreshToken: string): Promise<string> {
    const drive = getDriveClient(refreshToken)

    // Buscar carpeta VIRA existente
    const res = await drive.files.list({
        q: "name='VIRA' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)',
        spaces: 'drive',
    })

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id!
    }

    // Crear carpeta VIRA
    const folder = await drive.files.create({
        requestBody: {
            name: 'VIRA',
            mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
    })

    return folder.data.id!
}

/**
 * Obtiene o crea una subcarpeta dentro de VIRA
 */
export async function getOrCreateSubfolder(
    refreshToken: string,
    parentFolderId: string,
    folderName: string
): Promise<string> {
    const drive = getDriveClient(refreshToken)

    // Buscar subcarpeta existente
    const res = await drive.files.list({
        q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
    })

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id!
    }

    // Crear subcarpeta
    const folder = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId],
        },
        fields: 'id',
    })

    return folder.data.id!
}

/**
 * Sube un archivo al Drive del usuario
 */
export async function uploadFileToDrive(
    refreshToken: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
    folderType: 'cortinas' | 'musica' | 'efectos' | 'jingles' | 'intros' | 'outros' | 'voces'
): Promise<{
    fileId: string
    webViewLink: string
    webContentLink: string
    directLink: string
}> {
    const drive = getDriveClient(refreshToken)

    // Obtener/crear estructura de carpetas
    const viraFolderId = await getOrCreateViraFolder(refreshToken)
    const typeFolderId = await getOrCreateSubfolder(refreshToken, viraFolderId, folderType)

    // Convertir Buffer a Readable stream
    const readable = new Readable()
    readable.push(file)
    readable.push(null)

    // Subir archivo
    const response = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [typeFolderId],
        },
        media: {
            mimeType,
            body: readable,
        },
        fields: 'id, webViewLink, webContentLink',
    })

    const fileId = response.data.id!

    // Hacer el archivo accesible con link
    await drive.permissions.create({
        fileId,
        requestBody: {
            role: 'reader',
            type: 'anyone',
        },
    })

    return {
        fileId,
        webViewLink: response.data.webViewLink || '',
        webContentLink: response.data.webContentLink || '',
        directLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
    }
}

/**
 * Elimina un archivo del Drive
 */
export async function deleteFileFromDrive(refreshToken: string, fileId: string): Promise<void> {
    const drive = getDriveClient(refreshToken)
    await drive.files.delete({ fileId })
}

/**
 * Lista archivos en una carpeta del Drive
 */
export async function listFilesInFolder(
    refreshToken: string,
    folderType: string
): Promise<Array<{
    id: string
    name: string
    mimeType: string
    size: string
    createdTime: string
}>> {
    const drive = getDriveClient(refreshToken)

    const viraFolderId = await getOrCreateViraFolder(refreshToken)
    const typeFolderId = await getOrCreateSubfolder(refreshToken, viraFolderId, folderType)

    const res = await drive.files.list({
        q: `'${typeFolderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, size, createdTime)',
        orderBy: 'createdTime desc',
    })

    return (res.data.files || []).map((file: any) => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size || '0',
        createdTime: file.createdTime!,
    }))
}
