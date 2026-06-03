// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { PostCard } from "@/components/feed/PostCard";
import type { Post } from "@/types";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  commentsApi: {
    getComments: vi.fn(),
    createComment: vi.fn(),
  },
  postsApi: {
    getTranslation: vi.fn(),
    translateText: vi.fn(),
    savePost: vi.fn(),
    unsavePost: vi.fn(),
    deletePost: vi.fn(),
    reportPost: vi.fn(),
  },
  wordsApi: {
    saveWord: vi.fn(),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock("@/contexts/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/services/api", () => ({
  commentsApi: mocks.commentsApi,
  postsApi: mocks.postsApi,
  wordsApi: mocks.wordsApi,
  LANGUAGES: [
    { code: "en", name: "English", flag: "EN" },
    { code: "es", name: "Spanish", flag: "ES" },
  ],
}));

const post = (overrides: Partial<Post> = {}): Post => ({
  id: "post-1",
  author: {
    id: "author-1",
    name: "Ana",
    avatar: "A",
    language: "Spanish",
    flag: "ES",
  },
  content: "hola mundo",
  originalLanguage: "es",
  translation: "",
  location: "",
  distance: "",
  imageUrls: ["https://cdn.example.com/first.jpg", "https://cdn.example.com/second.jpg"],
  reactions: { likes: 0, comments: 0 },
  time: "Now",
  ...overrides,
});

const renderWithProviders = (ui: ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("PostCard image scanning", () => {
  it("routes the clicked post image to the scanner page", () => {
    renderWithProviders(<PostCard post={post()} />);

    fireEvent.click(screen.getByRole("button", { name: "Show photo 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Open post image" }));
    fireEvent.click(screen.getByRole("button", { name: "Scan image vocab" }));

    expect(mocks.navigate).toHaveBeenCalledWith("/scanner", {
      state: {
        source: "post-image",
        postId: "post-1",
        imageUrl: "https://cdn.example.com/second.jpg",
        imageIndex: 1,
        authorName: "Ana",
        postContext: "hola mundo",
      },
    });
  });
});
