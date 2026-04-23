import type { IStreamingService } from "./IStreamingService.js";
import type { RecognitionResult, StreamingLink } from "../types.js";

/**
 * Stub para YouTube Music — substituir por integração real com YouTube Data API v3.
 * Requer: YOUTUBE_API_KEY.
 */
export class YouTubeMusicStub implements IStreamingService {
  readonly platform = "youtube_music" as const;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async search(_recognition: RecognitionResult): Promise<StreamingLink | null> {
    return null;
  }
}
