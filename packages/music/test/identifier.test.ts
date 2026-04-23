import { describe, it, expect, vi, beforeEach } from "vitest";
import { MusicIdentifier } from "../src/MusicIdentifier.js";
import type { RecognitionResult } from "../src/types.js";

// Stub dos serviços externos para testes unitários
vi.mock("../src/recognition/AcrCloudService.js", () => ({
  AcrCloudService: vi.fn().mockImplementation(() => ({
    recognizeFromUrl: vi.fn(),
    recognizeFromBuffer: vi.fn(),
  })),
}));

vi.mock("../src/streaming/StreamingServiceFactory.js", () => ({
  StreamingServiceFactory: vi.fn().mockImplementation(() => ({
    getAll: vi.fn().mockReturnValue([
      {
        platform: "spotify",
        search: vi.fn().mockResolvedValue({
          platform: "spotify",
          url: "https://open.spotify.com/track/mockId",
          trackId: "mockId",
          coverUrl: "https://i.scdn.co/image/mock",
          previewUrl: "https://p.scdn.co/mp3-preview/mock",
        }),
      },
    ]),
    get: vi.fn(),
  })),
}));

describe("MusicIdentifier", () => {
  let identifier: MusicIdentifier;

  beforeEach(() => {
    identifier = new MusicIdentifier();
  });

  it("usa metadados como fallback quando não há audioUrl", async () => {
    const result = await identifier.identify({
      title: "Bohemian Rhapsody",
      artist: "Queen",
    });

    expect(result.recognition.title).toBe("Bohemian Rhapsody");
    expect(result.recognition.artist).toBe("Queen");
    expect(result.recognition.source).toBe("metadata");
    expect(result.recognition.confidence).toBe(0.5);
  });

  it("devolve link Spotify quando pesquisa tem sucesso", async () => {
    const result = await identifier.identify({
      title: "Bohemian Rhapsody",
      artist: "Queen",
    });

    expect(result.links).toHaveLength(1);
    expect(result.bestLink?.platform).toBe("spotify");
    expect(result.bestLink?.url).toContain("spotify.com/track");
  });

  it("devolve resultado vazio quando não há título nem áudio", async () => {
    const result = await identifier.identify({});

    expect(result.recognition.title).toBe("");
    expect(result.links).toHaveLength(0);
    expect(result.bestLink).toBeNull();
  });

  it("tenta ACRCloud quando audioUrl está presente e usa fallback em falha", async () => {
    const { AcrCloudService } = await import("../src/recognition/AcrCloudService.js");
    const mockInstance = vi.mocked(AcrCloudService).mock.results[0]?.value as {
      recognizeFromUrl: ReturnType<typeof vi.fn>;
    };
    if (mockInstance) {
      mockInstance.recognizeFromUrl.mockRejectedValueOnce(new Error("ACRCloud timeout"));
    }

    const result = await identifier.identify({
      title: "Blinding Lights",
      artist: "The Weeknd",
      audioUrl: "https://example.com/sample.mp3",
    });

    // Falha no ACRCloud → usa metadados
    expect(result.recognition.source).toBe("metadata");
    expect(result.recognition.title).toBe("Blinding Lights");
  });
});

describe("RecognitionResult shape", () => {
  it("valida estrutura mínima de RecognitionResult", () => {
    const r: RecognitionResult = {
      title: "Test",
      artist: "Artist",
      confidence: 0.95,
      source: "acrcloud",
    };
    expect(r.confidence).toBeGreaterThan(0);
    expect(["acrcloud", "metadata"]).toContain(r.source);
  });
});
