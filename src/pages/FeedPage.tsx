import { Globe } from "lucide-react";
import PostCard from "@/components/feed/PostCard";

// Placeholder post data
const mockPosts = [
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

export default function FeedPage() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 overflow-x-hidden">
      {/* Language filter chips */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-thin -mx-4 px-4">
        <button className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Globe className="h-4 w-4" />
          All
        </button>
        {["🇪🇸 Spanish", "🇯🇵 Japanese", "🇫🇷 French", "🇩🇪 German"].map((lang) => (
          <button
            key={lang}
            className="shrink-0 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {mockPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
