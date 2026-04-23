import { SpotifyService } from "./SpotifyService.js";
import { AppleMusicStub } from "./AppleMusicStub.js";
import { YouTubeMusicStub } from "./YouTubeMusicStub.js";
import type { IStreamingService } from "./IStreamingService.js";

export class StreamingServiceFactory {
  private services: IStreamingService[];

  constructor() {
    this.services = [
      new SpotifyService({
        clientId: process.env["SPOTIFY_CLIENT_ID"] ?? "",
        clientSecret: process.env["SPOTIFY_CLIENT_SECRET"] ?? "",
      }),
      new AppleMusicStub(),
      new YouTubeMusicStub(),
    ];
  }

  getAll(): IStreamingService[] {
    return this.services;
  }

  get(platform: IStreamingService["platform"]): IStreamingService | undefined {
    return this.services.find((s) => s.platform === platform);
  }
}
