import { Search, Check, CheckCheck } from "lucide-react";

const mockConversations = [
  {
    id: "1",
    name: "Maria Garcia",
    avatar: "M",
    lastMessage: "¡Perfecto! See you tomorrow then 😊",
    time: "2m ago",
    unread: 2,
    online: true,
  },
  {
    id: "2",
    name: "Japanese Study Group",
    avatar: "日",
    lastMessage: "Yuki: Does anyone know a good kanji app?",
    time: "1h ago",
    unread: 0,
    isGroup: true,
  },
  {
    id: "3",
    name: "Pierre Dubois",
    avatar: "P",
    lastMessage: "Thanks for the correction!",
    time: "3h ago",
    unread: 0,
    online: false,
  },
  {
    id: "4",
    name: "Alex Chen",
    avatar: "A",
    lastMessage: "You: That's a great question about...",
    time: "1d ago",
    unread: 0,
    online: true,
  },
];

export default function MessagesPage() {
  return (
    <div className="mx-auto max-w-2xl">
      {/* Search */}
      <div className="sticky top-0 z-10 bg-background px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full rounded-xl border border-input bg-muted/50 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Conversations list */}
      <div className="divide-y divide-border">
        {mockConversations.map((convo) => (
          <button
            key={convo.id}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-coral-light text-sm font-semibold text-primary-foreground">
                {convo.avatar}
              </div>
              {convo.online && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-sage" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-medium text-foreground truncate">{convo.name}</span>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">{convo.time}</span>
              </div>
              <div className="flex items-center gap-1">
                {convo.lastMessage.startsWith("You:") && (
                  <CheckCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
                <p className="text-sm text-muted-foreground truncate">{convo.lastMessage}</p>
              </div>
            </div>

            {/* Unread badge */}
            {convo.unread > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {convo.unread}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
