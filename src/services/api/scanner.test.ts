// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { scanImage, scanPostImage } from "./scanner";

const backendDetection = (label: string, confidence: number) => ({
  label,
  confidence,
  native_word: label,
  learning_word: label,
  language_code: "en",
});

describe("scanner API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("maps object-store post image failures to a user-facing message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Post image is not stored in the configured object store" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ));

    await expect(scanPostImage("post-1", {
      imageIndex: 0,
      imageUrl: "https://images.unsplash.com/mock.jpg",
    })).rejects.toThrow("This post image is not available for scanning. Try an uploaded image.");
  });

  it("sends upload scan mode and applies precision cap by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          detected_objects: [
            backendDetection("lamp", 0.09),
            backendDetection("chair", 0.08),
            backendDetection("table", 0.07),
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["image-bytes"], "scan.jpg", { type: "image/jpeg" });

    const result = await scanImage(file);

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get("scan_mode")).toBe("precision");
    expect(result.detectedObjects.map((object) => object.label)).toEqual(["lamp", "chair"]);
  });

  it("sends post-image scene mode and applies scene cap", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          detected_objects: [
            backendDetection("lamp", 0.09),
            backendDetection("chair", 0.08),
            backendDetection("table", 0.07),
            backendDetection("menu board", 0.06),
            backendDetection("counter", 0.055),
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await scanPostImage("post-1", {
      imageIndex: 1,
      imageUrl: "https://cdn.example.test/images/second.jpg",
      scanMode: "scene",
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({
      image_index: 1,
      image_url: "https://cdn.example.test/images/second.jpg",
      scan_mode: "scene",
    });
    expect(result.detectedObjects.map((object) => object.label)).toEqual([
      "lamp",
      "chair",
      "table",
      "menu board",
    ]);
  });
});
