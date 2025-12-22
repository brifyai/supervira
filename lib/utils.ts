import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

interface RetryOptions {
  retries?: number
  backoff?: number
  onRetry?: (attempt: number, error: any) => void
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    backoff = 2000, // ✅ MEJORA: Aumentado de 1s a 2s para mejor manejo de 429
    onRetry
  } = retryOptions

  let lastError: any

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Si es un error 5xx (servidor) o 429 (rate limit), lanzamos error para reintentar
      if (!response.ok && (response.status >= 500 || response.status === 429)) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return response
    } catch (error) {
      lastError = error

      if (attempt < retries) {
        const delay = backoff * Math.pow(2, attempt) // Exponential backoff
        console.warn(`⚠️ Intento ${attempt + 1}/${retries} fallido. Reintentando en ${delay}ms...`, error)

        if (onRetry) {
          onRetry(attempt + 1, error)
        }

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}