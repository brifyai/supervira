export type UserRole = 'super_admin' | 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  nombre_completo: string | null;
  image: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface NoticiaScrapeada {
  id: string;
  titulo: string;
  contenido: string | null;
  resumen: string | null;
  url: string | null;
  fuente: string | null;
  categoria: string;
  sentimiento: 'positivo' | 'negativo' | 'neutral';
  prioridad: 'alta' | 'media' | 'baja';
  region: string | null;
  autor: string | null;
  imagen_url: string | null;
  fecha_publicacion: string | null;
  fecha_scraping: string;
  fue_procesada: boolean;
}

export interface AudioConfig {
  cortinas_enabled: boolean;
  cortinas_frequency: number;
  cortina_default_id: string | null;
  cortina_default_url: string | null;
  background_music_enabled: boolean;
  background_music_id: string | null;
  background_music_url: string | null;
  background_music_volume: number;
}

export interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string | null;
  region: string;
  radio_station: string | null;
  duracion_minutos: number;
  voz_proveedor: string;
  voz_id: string;
  incluir_clima: boolean;
  incluir_hora: boolean;
  frecuencia_anuncios: number;
  categorias: string[]; // JSONB en DB
  configuracion: Record<string, any>; // JSONB en DB
  audio_config?: AudioConfig; // Configuración de audio
  user_id: string | null;
  created_at: string;
}

export interface Noticiero {
  id: string;
  titulo: string;
  contenido: string | null;
  region?: string;
  datos_timeline: any; // JSONB timeline data
  url_audio: string | null;
  s3_key: string | null;
  duracion_segundos: number | null;
  estado: 'generado' | 'procesando' | 'completado' | 'fallido';
  costo_generacion: number;
  total_tokens: number;
  metadata: Record<string, any>;
  background_music_url?: string | null;
  background_music_volume?: number | null;
  plantilla_id: string | null;
  user_id: string | null;
  fecha_publicacion: string | null;
  created_at: string;
}

export interface AudioBiblioteca {
  id: string;
  nombre: string;
  audio: string | null; // URL
  tipo: 'voz' | 'musica' | 'efecto' | 'jingle' | 'cortina' | 'intro' | 'outro';
  genero: 'masculino' | 'femenino' | 'neutro' | null;
  idioma: string;
  duracion: string | null;
  duration_seconds: number | null;
  descripcion: string | null;
  category: string | null;
  s3_key: string | null;
  is_active: boolean;
  usuario?: string | null;
  created_at: string;
}

export interface TareaProgramada {
  id: string;
  nombre: string;
  tipo: 'noticiero' | 'publicacion_social' | 'scraping';
  horario: string | null; // Cron expression
  esta_activo: boolean;
  configuracion: Record<string, any>;
  ultima_ejecucion: string | null;
  proxima_ejecucion: string | null;
  total_ejecuciones: number;
  ejecuciones_exitosas: number;
  user_id: string | null;
  created_at: string;
}

export interface FuenteNoticias {
  id: string;
  nombre: string; // Región
  nombre_fuente: string; // Emol, La Tercera, etc
  url: string;
  rss_url: string | null;
  esta_activo: boolean;
}

export interface ConfiguracionRegion {
  id: string;
  region: string;
  zona_horaria: string;
  clima_habilitado: boolean;
  proveedor_voz_default: string;
  voz_id_default: string;
  fuentes_scraping: string[]; // JSONB
  frecuencia_anuncios: number;
  max_noticias_por_reporte: number;
  esta_activo: boolean;
}

// Tipos para el Generador de Noticieros (Frontend)
export interface GeneracionConfig {
  titulo: string;
  region: string;
  duracionMinutos: number;
  categorias: string[];
  incluirClima: boolean;
  incluirHora: boolean;
  cantidadAnuncios: number;
  audioConfig?: AudioConfig;
}

// Tipos para items del Timeline
export interface TimelineItem {
  id: string;
  title: string;
  content: string;
  type?: 'news' | 'ad' | 'advertisement' | 'cortina' | 'musica' | 'efecto' | 'intro' | 'outro';
  category?: string;
  duration: number;
  audioUrl?: string;
  insertedBy?: 'user' | 'ai' | 'manual';
  audioLibraryId?: string;
  versions?: {
    original: string;
    rewritten?: string;
    humanized?: string;
  };
  activeVersion?: 'original' | 'rewritten' | 'humanized';
}

// TTS Interfaces
export interface TTSRequest {
  text: string;
  voiceId?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  // Provider specific options
  voice?: string;
  rate?: string;
  style?: number;
  similarityBoost?: number;
  model?: string;
  engine?: string;
  outputFormat?: string;
}

export interface TTSResponse {
  audioData?: ArrayBuffer;
  audioUrl?: string;
  format: string;
  duration: number;
  cost: number;
  s3Key?: string;
  provider?: string;
  voice?: string;
  success?: boolean;
}

export interface TTSProvider {
  name: string;
  synthesize(text: string, options?: any): Promise<TTSResponse>;
  validateConfig(): Promise<boolean>;
  estimateCost?(chars: number): number;
  isConfigured?(): boolean;
}