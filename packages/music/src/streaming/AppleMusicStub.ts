import type { IStreamingService } from "./IStreamingService.js";
import type { RecognitionResult, StreamingLink } from "../types.js";

/**
 * Stub para Apple Music — substituir por integração real com MusicKit JS / API.
 * Requer: APPLE_MUSIC_KEY_ID, APPLE_TEAM_ID, APPLE_PRIVATE_KEY (JWT RS256).
 */
export class AppleMusicStub implements IStreamingService {
  readonly platform = "apple_music" as const;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async search(_recognition: RecognitionResult): Promise<StreamingLink | null> {
    return null;
  }
}
