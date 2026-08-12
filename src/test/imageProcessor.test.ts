import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processImageWithProjectSettings } from "@/lib/imageProcessor";

describe("processImageWithProjectSettings", () => {
  let imageSize = { width: 1920, height: 1080 };
  let drawImage: ReturnType<typeof vi.fn>;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    imageSize = { width: 1920, height: 1080 };
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:ateliermojis"),
      revokeObjectURL: vi.fn(),
    });

    class FakeImage {
      width = imageSize.width;
      height = imageSize.height;
      naturalWidth = imageSize.width;
      naturalHeight = imageSize.height;
      onload: (() => void) | null = null;
      onerror: ((error: unknown) => void) | null = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal("Image", FakeImage);

    drawImage = vi.fn();
    canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        imageSmoothingEnabled: false,
        imageSmoothingQuality: "low",
        drawImage,
      })),
      toBlob: vi.fn((callback: BlobCallback) => {
        callback(new Blob(["processed"], { type: "image/png" }));
      }),
    } as unknown as HTMLCanvasElement;

    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") return canvas;
      return createElement(tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("exports the selected square from a landscape image", async () => {
    const result = await processImageWithProjectSettings(
      new File(["source"], "photo.jpg", { type: "image/jpeg" }),
      {
        crop: {
          unit: "%",
          x: 25,
          y: 0,
          width: 56.25,
          height: 100,
        },
      },
    );

    expect(canvas.width).toBe(128);
    expect(canvas.height).toBe(128);
    expect(result.width).toBe(128);
    expect(result.height).toBe(128);
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      480,
      0,
      1080,
      1080,
      0,
      0,
      128,
      128,
    );
  });

  it("uses the centered square when no crop is saved", async () => {
    imageSize = { width: 800, height: 1200 };

    await processImageWithProjectSettings(
      new File(["source"], "portrait.jpg", { type: "image/jpeg" }),
      { crop: undefined },
    );

    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      200,
      800,
      800,
      0,
      0,
      128,
      128,
    );
  });
});
