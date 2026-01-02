export interface Region {
  x: number;      // 0-100%
  y: number;      // 0-100%
  width: number;  // 0-100%
  height: number; // 0-100%
}

export interface ProcessedImage {
  id: string;
  file: File;
  originalUrl: string;
  processedUrl: string | null; // The raw output from AI
  finalUrl: string | null; // The composited result
  status: 'idle' | 'processing' | 'completed' | 'error';
  error?: string;
  region: Region; // Individual region for this image
}
