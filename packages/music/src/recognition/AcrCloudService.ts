import { createHmac } from "node:crypto";
import type { RecognitionResult } from "../types.js";

interface AcrCloudConfig {
  host: string;
  accessKey: string;
  accessSecret: string;
}

interface AcrTrack {
  title: string;
  artists: Array<{ name: string }>;
  album?: { name: string };
  external_ids?: { isrc?: string };
  release_date?: string;
  score?: number;
}

interface AcrResponse {
  status: { msg: string; code: number };
  metadata?: { music?: AcrTrack[] };
}

export class AcrCloudService {
  constructor(private cfg: AcrCloudConfig) {}

  async recognizeFromUrl(audioUrl: string): Promise<RecognitionResult | null> {
    const resp = await fetch(audioUrl);
    if (!resp.ok) throw new Error(`Audio fetch failed: ${resp.status}`);
    const buffer = Buffer.from(await resp.arrayBuffer());
    return this.recognizeFromBuffer(buffer);
  }

  async recognizeFromBuffer(buffer: Buffer): Promise<RecognitionResult | null> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const dataType = "audio";
    const sigVersion = "1";
    const stringToSign = [
      "POST",
      "/v1/identify",
      this.cfg.accessKey,
      dataType,
      sigVersion,
      timestamp,
    ].join("\n");
    const signature = createHmac("sha1", this.cfg.accessSecret)
      .update(stringToSign)
      .digest("base64");

    const form = new FormData();
    form.append("access_key", this.cfg.accessKey);
    form.append("sample_bytes", buffer.byteLength.toString());
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    form.append("sample", new Blob([ab], { type: "audio/mpeg" }), "audio.mp3");
    form.append("data_type", dataType);
    form.append("signature_version", sigVersion);
    form.append("signature", signature);
    form.append("timestamp", timestamp);

    const res = await fetch(`https://${this.cfg.host}/v1/identify`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) throw new Error(`ACRCloud API error: ${res.status}`);
    const data = (await res.json()) as AcrResponse;

    if (data.status.code !== 0 || !data.metadata?.music?.length) return null;

    const track = data.metadata.music[0]!;
    return {
      title: track.title,
      artist: track.artists.map((a) => a.name).join(", "),
      album: track.album?.name,
      isrc: track.external_ids?.isrc,
      releaseDate: track.release_date,
      confidence: (track.score ?? 100) / 100,
      source: "acrcloud",
    };
  }
}
