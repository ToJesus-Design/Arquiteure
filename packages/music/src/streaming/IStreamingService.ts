import type { RecognitionResult, StreamingLink } from "../types.js";

export interface IStreamingService {
  readonly platform: StreamingLink["platform"];
  search(recognition: RecognitionResult): Promise<StreamingLink | null>;
}
