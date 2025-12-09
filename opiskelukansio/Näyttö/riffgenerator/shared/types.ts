
/**
 * Shared TypeScript types for RiffGenerator application
 * Used by both frontend and backend for type safety
 */

// Music-related types
export interface Note {
  pitch: number;           // MIDI note number (0-127)
  velocity: number;        // Note velocity (0-127)
  start_time: number;      // Start time in beats/seconds
  duration: number;        // Duration in beats/seconds
  string?: number;         // Guitar string (1-6)
  fret?: number;          // Guitar fret (0-24)
  note_name?: string;     // Note name (e.g., "C4", "F#3")
  confidence?: number;    // Confidence score for converted notes (0.0-1.0)
}

// Riff generation types
export interface RiffConfig {
  style: RiffStyle;
  tempo: number;
  key: string;
  time_signature: string;
  duration_bars: number;
  complexity?: number;     // 0.0-1.0
}

export interface RiffData {
  notes: Note[];
  config: RiffConfig;
  metadata: {
    generated_at: string;
    note_count: number;
    total_duration: number;
  };
}

export enum RiffStyle {
  ROCK = 'rock',
  BLUES = 'blues',
  METAL = 'metal',
  FUNK = 'funk',
  JAZZ = 'jazz',
  ACOUSTIC = 'acoustic'
}

// Audio conversion types
export interface ConversionResult {
  notes: Note[];
  metadata: {
    source_file: string;
    conversion_settings: ConversionSettings;
    note_count: number;
    total_duration: number;
    pitch_range: {
      min: number;
      max: number;
    };
  };
  statistics: AudioStatistics;
}

export interface ConversionSettings {
  hop_length: number;
  frame_rate: number;
  min_note_duration: number;
  pitch_threshold: number;
  onset_threshold?: number;
  tuning_tolerance?: number;
}

export interface AudioStatistics {
  pitch_stats: {
    mean: number;
    std: number;
    range: [number, number];
  };
  duration_stats: {
    mean: number;
    std: number;
    range: [number, number];
  };
  velocity_stats: {
    mean: number;
    std: number;
    range: [number, number];
  };
  confidence_stats?: {
    mean: number;
    std: number;
    range: [number, number];
  };
}

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GenerateRiffRequest {
  style: string;
  tempo: number;
  key: string;
  duration: number;
}

export interface GenerateRiffResponse extends ApiResponse<RiffData> {}

export interface ConvertAudioRequest {
  audio: File | Blob;
  settings?: Partial<ConversionSettings>;
}

export interface ConvertAudioResponse extends ApiResponse<ConversionResult> {}

export interface ExportRequest {
  riff: RiffData;
  format: ExportFormat;
}

export enum ExportFormat {
  MIDI = 'midi',
  WAV = 'wav',
  MP3 = 'mp3',
  JSON = 'json'
}

// UI state types
export interface AppState {
  currentRiff: RiffData | null;
  isGenerating: boolean;
  isConverting: boolean;
  isPlaying: boolean;
  selectedStyle: RiffStyle;
  tempo: number;
  key: string;
  duration: number;
}

export interface PlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

// Settings types
export interface UserSettings {
  defaultStyle: RiffStyle;
  defaultTempo: number;
  defaultKey: string;
  autoPlay: boolean;
  theme: 'light' | 'dark' | 'auto';
  apiEndpoint: string;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// File upload types
export interface FileUpload {
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;