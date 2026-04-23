export interface RecognitionResult {
  title: string;
  artist: string;
  album?: string;
  isrc?: string;
  releaseDate?: string;
  confidence: number;
  source: "acrcloud" | "metadata";
}

export interface StreamingLink {
  platform: "spotify" | "apple_music" | "youtube_music";
  url: string;
  trackId: string;
  previewUrl?: string;
  coverUrl?: string;
}

export interface MusicIdentificationResult {
  recognition: RecognitionResult;
  links: StreamingLink[];
  bestLink: StreamingLink | null;
}

export interface MusicPostMeta {
  title?: string;
  artist?: string;
  audioUrl?: string;
}
