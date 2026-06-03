// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ScannerPage from "./ScannerPage";
import type { ScannerRouteState } from "@/types/scanner";

const mocks = vi.hoisted(() => ({
  scanImage: vi.fn(),
  scanPostImage: vi.fn(),
  saveDetectedObject: vi.fn(),
  createSavedWord: vi.fn(),
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/services/api/scanner", () => ({
  scanImage: mocks.scanImage,
  scanPostImage: mocks.scanPostImage,
  saveDetectedObject: mocks.saveDetectedObject,
}));

vi.mock("@/services/api/learn", () => ({
  createSavedWord: mocks.createSavedWord,
}));

vi.mock("@/hooks/useLearnApi", () => ({
  learnKeys: {
    words: () => ["learn", "words"],
    stats: () => ["learn", "stats"],
  },
}));

vi.mock("sonner", () => ({
  toast: mocks.toast,
}));

const renderPage = (state?: ScannerRouteState) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: "/scanner", state }]}>
        <ScannerPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:scanner-preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  mocks.scanImage.mockResolvedValue({ scanSessionId: "upload-scan", detectedObjects: [] });
  mocks.scanPostImage.mockResolvedValue({
    scanSessionId: "post-scan-123456",
    detectedObjects: [
      {
        id: "detection-1",
        label: "apple",
        confidence: 0.08,
        nativeWord: "apple",
        learningWord: "manzana",
        languageCode: "es",
      },
    ],
  });
  mocks.saveDetectedObject.mockResolvedValue({});
  mocks.createSavedWord.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

describe("ScannerPage post image scans", () => {
  it("auto-scans transferred post image state and saves detections by id", async () => {
    renderPage({
      source: "post-image",
      postId: "post-1",
      imageUrl: "https://cdn.example.com/second.jpg",
      imageIndex: 1,
      authorName: "Ana",
      postContext: "hola mundo",
    });

    await waitFor(() => {
      expect(mocks.scanPostImage).toHaveBeenCalledWith("post-1", {
        imageIndex: 1,
        imageUrl: "https://cdn.example.com/second.jpg",
      });
    });

    expect(await screen.findAllByText("manzana")).toHaveLength(2);
    expect(screen.getAllByText("apple")).toHaveLength(2);
    expect(screen.queryByText("High confidence")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add to word bank" }));

    await waitFor(() => {
      expect(mocks.saveDetectedObject).toHaveBeenCalledWith("detection-1");
    });
    expect(mocks.createSavedWord).not.toHaveBeenCalled();
  });

  it("keeps uploaded images on the regular scanImage flow", async () => {
    const { container } = renderPage();
    const file = new File(["image-bytes"], "photo.png", { type: "image/png" });
    const galleryInput = container.querySelectorAll<HTMLInputElement>('input[type="file"]')[1];

    fireEvent.change(galleryInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Identify & Translate" }));

    await waitFor(() => {
      expect(mocks.scanImage).toHaveBeenCalledWith(file);
    });
    expect(mocks.scanPostImage).not.toHaveBeenCalled();
  });
});
