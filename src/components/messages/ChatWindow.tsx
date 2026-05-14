import { useState } from "react";
import { Send, MoreVertical, Phone, Video } from "lucide-react";
import { format } from "date-fns";
import type { Conversation, Message } from "@/types/message";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface ChatWindowProps {
    conversation: Conversation;
    messages: Message[];
    onSendMessage: (content: string) => void;
    onBack?: () => void;
    isLoading?: boolean;
}

export function ChatWindow({ conversation, messages, onSendMessage, onBack, isLoading }: ChatWindowProps) {
    const { user } = useAuth();
    const [newMessage, setNewMessage] = useState("");

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        onSendMessage(newMessage);
        setNewMessage("");
    };

    // Helper to get display info
    const getDisplayInfo = () => {
        if (conversation.isGroup) {
            return {
                name: conversation.groupName || 'Group Chat',
                avatar: conversation.groupAvatar || '👥',
            };
        }
        const otherParticipant = conversation.participants.find(p => p.id !== user?.id) || conversation.participants[0];
        return {
            name: otherParticipant?.displayName || 'Unknown User',
            avatar: otherParticipant?.avatarUrl,
            initial: otherParticipant?.displayName?.[0] || '?'
        };
    };

    const info = getDisplayInfo();

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    {/* Mobile Back Button */}
                    <button
                        onClick={onBack}
                        className="lg:hidden p-2 -ml-2 mr-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5" />
                            <path d="M12 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-semibold text-primary-foreground">
                        {info.avatar && info.avatar.startsWith('http') ? (
                            <img
                                src={info.avatar}
                                alt={info.name}
                                className="h-10 w-10 rounded-full object-cover"
                            />
                        ) : (
                            info.initial
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">{info.name}</h3>
                        {!conversation.isGroup && (
                            <span className="text-xs text-muted-foreground">Online</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <Phone className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <Video className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Messages Area — oldest at top, newest at bottom (Messenger pattern) */}
            {/* Backend returns DESC (newest first). We reverse to get oldest first, then render top→bottom. */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="flex flex-col gap-1 justify-end min-h-full">
                    {[...messages]
                        .filter(msg => msg.content && msg.content.trim() !== '')
                        .reverse()
                        .map((msg, index, arr) => {
                            const isMeMock = msg.senderId === 'current-user' || msg.senderId === user?.id;

                            // After reversing: arr is oldest→newest (ASC)
                            // prevMsg in ASC order = older message
                            const prevMsg = arr[index - 1];
                            const showAvatar = !isMeMock && (!prevMsg || prevMsg.senderId !== msg.senderId);
                            const isNewGroup = !prevMsg || prevMsg.senderId !== msg.senderId;

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex w-full ${isMeMock ? "justify-end" : "justify-start"} ${isNewGroup ? "mt-3" : "mt-0.5"}`}
                                >
                                    <div className={`flex max-w-[70%] gap-2 ${isMeMock ? "flex-row-reverse" : "flex-row"}`}>

                                        {/* Avatar for other users */}
                                        {!isMeMock && (
                                            <div className="w-8 shrink-0 self-end">
                                                {showAvatar && (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-semibold text-primary-foreground">
                                                        {info.initial}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div
                                            className={`rounded-2xl px-4 py-2 shadow-sm ${
                                                isMeMock
                                                    ? "bg-primary text-primary-foreground rounded-tr-none"
                                                    : "bg-muted text-foreground rounded-tl-none"
                                            }`}
                                        >
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                            <div className={`text-[10px] mt-1 text-right ${
                                                isMeMock ? "text-primary-foreground/70" : "text-muted-foreground"
                                            }`}>
                                                {format(new Date(msg.createdAt), "HH:mm")}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-card">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!newMessage.trim() || isLoading}
                        className="rounded-xl h-10 w-10 shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
