import { useState, useCallback } from "react";
import { Globe, Plus } from "lucide-react";
import PostCard from "@/components/feed/PostCard";
import ComposeModal from "@/components/feed/ComposeModal";
import { Button } from "@/components/ui/button";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import type { Post } from "@/types";

// Placeholder post data
const initialPosts: Post[] = [
  {
    id: "1",
    author: {
      name: "Maria Garcia",
      avatar: "M",
      language: "Spanish",
      flag: "🇪🇸",
    },
    content: "¡Hola amigos! Hoy visité un café nuevo en el centro. El café con leche estaba delicioso.",
    translation: "Hello friends! Today I visited a new café downtown. The café con leche was delicious.",
    location: "Madrid, Spain",
    distance: "2.5 km",
    reactions: { likes: 24, comments: 8 },
    time: "2h ago",
  },
  {
    id: "2",
    author: {
      name: "Yuki Tanaka",
      avatar: "Y",
      language: "Japanese",
      flag: "🇯🇵",
    },
    content: "今日は公園で桜を見ました。とても綺麗でした！",
    translation: "Today I saw cherry blossoms in the park. They were very beautiful!",
    location: "Tokyo, Japan",
    distance: "4.8 km",
    reactions: { likes: 56, comments: 12 },
    time: "4h ago",
  },
  {
    id: "3",
    author: {
      name: "Pierre Dubois",
      avatar: "P",
      language: "French",
      flag: "🇫🇷",
    },
    content: "Le marché aux fleurs ce matin était magnifique. J'ai acheté des tulipes pour ma mère.",
    translation: "The flower market this morning was beautiful. I bought tulips for my mother.",
    location: "Paris, France",
    distance: "1.2 km",
    reactions: { likes: 18, comments: 3 },
    time: "5h ago",
  },
];

// Simulated new posts for refresh
const newPostsPool: Post[] = [
  {
    id: "new1",
    author: {
      name: "Kim Soo-yeon",
      avatar: "K",
      language: "Korean",
      flag: "🇰🇷",
    },
    content: "오늘 한강에서 자전거를 탔어요. 날씨가 너무 좋았어요!",
    translation: "I rode a bike at Han River today. The weather was so nice!",
    location: "Seoul, Korea",
    distance: "3.2 km",
    reactions: { likes: 42, comments: 6 },
    time: "Just now",
  },
  {
    id: "new2",
    author: {
      name: "Luca Bianchi",
      avatar: "L",
      language: "Italian",
      flag: "🇮🇹",
    },
    content: "Ho fatto la pizza margherita per la prima volta. Era deliziosa!",
    translation: "I made margherita pizza for the first time. It was delicious!",
    location: "Rome, Italy",
    distance: "5.1 km",
    reactions: { likes: 38, comments: 15 },
    time: "Just now",
  },
];

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const handleRefresh = useCallback(async () => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Add a new post from the pool
    const newPost = {
      ...newPostsPool[refreshIndex % newPostsPool.length],
      id: Date.now().toString(),
      time: "Just now",
    };
    
    setPosts((prev) => [newPost, ...prev]);
    setRefreshIndex((prev) => prev + 1);
  }, [refreshIndex]);

  const handleCreatePost = (newPostData: Omit<Post, "id" | "time" | "reactions">) => {
    const newPost: Post = {
      ...newPostData,
      id: Date.now().toString(),
      time: "Just now",
      reactions: { likes: 0, comments: 0 },
    };
    setPosts([newPost, ...posts]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} className="h-full">
      <div className="w-full max-w-2xl mx-auto px-4 py-4 overflow-x-hidden">
        {/* Language filter chips - touch-friendly */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-thin -mx-4 px-4">
          <button className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground active:scale-95 transition-transform">
            <Globe className="h-4 w-4" />
            All
          </button>
          {["🇪🇸 Spanish", "🇯🇵 Japanese", "🇫🇷 French", "🇩🇪 German"].map((lang) => (
            <button
              key={lang}
              className="shrink-0 rounded-full bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground active:bg-muted/70 active:scale-95 transition-all"
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {/* Floating compose button - positioned above bottom nav */}
        <Button
          onClick={() => setIsComposeOpen(true)}
          size="lg"
          className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 h-14 w-14 rounded-full shadow-glow p-0 active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* Compose modal */}
        <ComposeModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          onSubmit={handleCreatePost}
        />
      </div>
    </PullToRefresh>
  );
}
