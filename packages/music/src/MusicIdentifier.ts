import { AcrCloudService } from "./recognition/AcrCloudService.js";
import { StreamingServiceFactory } from "./streaming/StreamingServiceFactory.js";
import type {
  MusicIdentificationResult,
  MusicPostMeta,
  RecognitionResult,
  StreamingLink,
} from "./types.js";

export class MusicIdentifier {
  private acrCloud: AcrCloudService;
  private factory: StreamingServiceFactory;

  constructor() {
    this.acrCloud = new AcrCloudService({
      host: process.env["ACRCLOUD_HOST"] ?? "",
      accessKey: process.env["ACRCLOUD_ACCESS_KEY"] ?? "",
      accessSecret: process.env["ACRCLOUD_ACCESS_SECRET"] ?? "",
    });
    this.factory = new StreamingServiceFactory();
  }

  async identify(meta: MusicPostMeta): Promise<MusicIdentificationResult> {
    const recognition = await this.recognize(meta);
    if (!recognition) {
      return { recognition: emptyRecognition(), links: [], bestLink: null };
    }

    const services = this.factory.getAll();
    const settled = await Promise.allSettled(services.map((s) => s.search(recognition)));
    const links: StreamingLink[] = settled
      .filter((r): r is PromiseFulfilledResult<StreamingLink | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((l): l is StreamingLink => l !== null);

    return { recognition, links, bestLink: links[0] ?? null };
  }

  private async recognize(meta: MusicPostMeta): Promise<RecognitionResult | null> {
    if (meta.audioUrl) {
      try {
        const result = await this.acrCloud.recognizeFromUrl(meta.audioUrl);
        if (result) return result;
      } catch (err) {
        console.warn("[music] ACRCloud failed, falling back to metadata:", (err as Error).message);
      }
    }

    if (meta.title) {
      return {
        title: meta.title,
        artist: meta.artist ?? "",
        confidence: 0.5,
        source: "metadata",
      };
    }

    return null;
  }
}

function emptyRecognition(): RecognitionResult {
  return { title: "", artist: "", confidence: 0, source: "metadata" };
}
