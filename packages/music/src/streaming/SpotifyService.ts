import type { IStreamingService } from "./IStreamingService.js";
import type { RecognitionResult, StreamingLink } from "../types.js";

interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  external_urls: { spotify: string };
  preview_url: string | null;
  album: { images: Array<{ url: string }> };
}

interface SpotifySearchBody {
  tracks: { items: SpotifyTrack[] };
}

interface SpotifyTokenBody {
  access_token: string;
  expires_in: number;
}

export class SpotifyService implements IStreamingService {
  readonly platform = "spotify" as const;
  private token: CachedToken | null = null;

  constructor(private cfg: SpotifyConfig) {}

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.value;
    }
    const creds = Buffer.from(`${this.cfg.clientId}:${this.cfg.clientSecret}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new Error(`Spotify token error: ${res.status}`);
    const data = (await res.json()) as SpotifyTokenBody;
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return this.token.value;
  }

  async search(recognition: RecognitionResult): Promise<StreamingLink | null> {
    const token = await this.getToken();
    if (recognition.isrc) {
      const hit = await this.query(token, `isrc:${recognition.isrc}`);
      if (hit) return hit;
    }
    return this.query(token, `track:${recognition.title} artist:${recognition.artist}`);
  }

  private async query(token: string, q: string): Promise<StreamingLink | null> {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = (await res.json()) as SpotifySearchBody;
    const track = data.tracks.items[0] ?? null;
    if (!track) return null;
    return {
      platform: "spotify",
      url: track.external_urls.spotify,
      trackId: track.id,
      previewUrl: track.preview_url ?? undefined,
      coverUrl: track.album.images[0]?.url,
    };
  }
}
