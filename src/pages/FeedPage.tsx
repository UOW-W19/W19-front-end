import { useState, useCallback } from "react";
import { Globe, Plus, MessageCircle, ChevronDown, Check } from "lucide-react";
import { PostCard } from "@/components/feed/PostCard";
import { ComposeModal } from "@/components/feed/ComposeModal";
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

const languages = ["Spanish", "Japanese", "French", "German", "Korean", "Italian"];
const languageFlags: Record<string, string> = {
  Spanish: "🇪🇸",
  Japanese: "🇯🇵",
  French: "🇫🇷",
  German: "🇩🇪",
  Korean: "🇰🇷",
  Italian: "🇮🇹",
};

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const filteredPosts = selectedLanguage
    ? posts.filter((post) => post.author.language === selectedLanguage)
    : posts;

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
        {/* Header with filters and post button */}
        <div className="mb-4 flex items-center justify-between gap-3">
          {/* Language dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
            >
              <span className="text-base">
                {selectedLanguage ? languageFlags[selectedLanguage] : "🌍"}
              </span>
              <span className="text-foreground">
                {selectedLanguage || "All Languages"}
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showLanguageDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowLanguageDropdown(false)} 
                />
                <div className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-50 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedLanguage(null);
                      setShowLanguageDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">All Languages</span>
                    </div>
                    {selectedLanguage === null && <Check className="h-4 w-4 text-primary" />}
                  </button>
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setSelectedLanguage(lang);
                        setShowLanguageDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{languageFlags[lang]}</span>
                        <span className="text-sm text-foreground">{lang}</span>
                      </div>
                      {selectedLanguage === lang && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Compose button */}
          <Button
            onClick={() => setIsComposeOpen(true)}
            size="sm"
            className="gap-1.5 h-9 px-4 rounded-full shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Post
          </Button>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No posts yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                No posts in {selectedLanguage} yet. Be the first to share something!
              </p>
            </div>
          )}
        </div>


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
