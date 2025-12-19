import { MapPin, Heart, MessageCircle, Globe } from "lucide-react";

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
          <article
            key={post.id}
            className="rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-soft animate-fade-in"
          >
            {/* Author header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-coral-light text-sm font-semibold text-primary-foreground">
                  {post.author.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{post.author.name}</span>
                    <span className="text-sm">{post.author.flag}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{post.location}</span>
                    <span>•</span>
                    <span>{post.distance}</span>
                  </div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{post.time}</span>
            </div>

            {/* Content */}
            <div className="mb-4 space-y-2">
              <p className="text-foreground leading-relaxed">{post.content}</p>
              <p className="text-sm text-muted-foreground italic">{post.translation}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 border-t border-border pt-3">
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Heart className="h-4 w-4" />
                <span>{post.reactions.likes}</span>
              </button>
              <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="h-4 w-4" />
                <span>{post.reactions.comments}</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
