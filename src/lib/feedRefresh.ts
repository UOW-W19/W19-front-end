import type { ApiPost } from "@/types";

const FEED_POST_CREATED_EVENT = "locale:feed-post-created";
const PENDING_FEED_POSTS_KEY = "locale:pending-feed-posts";

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readPendingPosts(): ApiPost[] {
  if (!canUseBrowserStorage()) return [];

  try {
    const raw = window.sessionStorage.getItem(PENDING_FEED_POSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingPosts(posts: ApiPost[]) {
  if (!canUseBrowserStorage()) return;

  try {
    window.sessionStorage.setItem(PENDING_FEED_POSTS_KEY, JSON.stringify(posts));
  } catch {
    // Feed refresh is best-effort; posting itself has already succeeded.
  }
}

export function notifyFeedPostCreated(post: ApiPost) {
  const pendingPosts = readPendingPosts().filter((pendingPost) => pendingPost.id !== post.id);
  writePendingPosts([post, ...pendingPosts].slice(0, 5));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<ApiPost>(FEED_POST_CREATED_EVENT, { detail: post }));
  }
}

export function consumePendingFeedPosts(): ApiPost[] {
  const pendingPosts = readPendingPosts();
  if (canUseBrowserStorage()) {
    window.sessionStorage.removeItem(PENDING_FEED_POSTS_KEY);
  }
  return pendingPosts;
}

export function subscribeToFeedPostCreated(onPostCreated: (post: ApiPost) => void) {
  if (typeof window === "undefined") return () => undefined;

  const listener = (event: Event) => {
    const createdPost = (event as CustomEvent<ApiPost>).detail;
    if (createdPost) onPostCreated(createdPost);
  };

  window.addEventListener(FEED_POST_CREATED_EVENT, listener);
  return () => window.removeEventListener(FEED_POST_CREATED_EVENT, listener);
}
