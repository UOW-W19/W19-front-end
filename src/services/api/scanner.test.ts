// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { scanPostImage } from "./scanner";

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
});
