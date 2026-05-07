import { useState, useRef, useEffect, useCallback } from "react";
import { Send, MoreVertical, Phone, Video, ImagePlus, X, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import type { Conversation, Message } from "@/types/message";
import { useAuth } from "@/contexts";
import { Button } from "@/components/ui/button";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface ChatWindowProps {
    conversation: Conversation;
    messages: Message[];
    onSendMessage: (content: string, image?: File) => void;
    onBack?: () => void;
    isLoading?: boolean;
}

export function ChatWindow({ conversation, messages, onSendMessage, onBack, isLoading }: ChatWindowProps) {
    const { user } = useAuth();
    const [newMessage, setNewMessage] = useState("");
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const prevConvIdRef = useRef<string>(conversation.id);

    const isNearBottom = () => {
        const el = containerRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    };

    const handleScroll = useCallback(() => {
        setShowScrollButton(!isNearBottom());
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener("scroll", handleScroll, { passive: true });
        return () => el.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    useEffect(() => {
        const isNewConversation = prevConvIdRef.current !== conversation.id;
        prevConvIdRef.current = conversation.id;

        if (isNewConversation) {
            messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
            setShowScrollButton(false);
        } else if (isNearBottom()) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [conversation.id, messages.length]);

    useEffect(() => {
        return () => {
            if (selectedImage) {
                URL.revokeObjectURL(selectedImage);
            }
        };
    }, [selectedImage]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedImageFile) return;
        onSendMessage(newMessage, selectedImageFile || undefined);
        setNewMessage("");
        setSelectedImage(null);
        setSelectedImageFile(null);
        if (imageInputRef.current) {
            imageInputRef.current.value = "";
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedImageFile(file);
        setSelectedImage(URL.createObjectURL(file));
    };

    const removeImage = () => {
        setSelectedImage(null);
        setSelectedImageFile(null);
        if (imageInputRef.current) {
            imageInputRef.current.value = "";
        }
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

    const { isOtherTyping, sendTyping } = useTypingIndicator(conversation.id, user?.id ?? '');

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

            {/* Messages Area */}
            <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
                <div className="flex flex-col justify-end min-h-full space-y-4">
                    {messages.map((msg, index) => {
                        // Fix: for mock data 'current-user' comparison
                        const isMeMock = msg.senderId === 'current-user' || msg.senderId === user?.id;

                        const showAvatar = !isMeMock && (index === 0 || messages[index - 1].senderId !== msg.senderId);

                        return (
                            <div
                                key={msg.id}
                                className={`flex w-full ${isMeMock ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`flex max-w-[70%] gap-2 ${isMeMock ? "flex-row-reverse" : "flex-row"}`}>

                                    {/* Avatar for other users */}
                                    {!isMeMock && (
                                        <div className="w-8 shrink-0">
                                            {showAvatar && (
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-semibold text-primary-foreground">
                                                    {info.initial}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div
                                        className={`rounded-2xl px-4 py-2 shadow-sm ${isMeMock
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-muted text-foreground rounded-tl-none"
                                            }`}
                                    >
                                        {msg.imageUrl && (
                                            <img
                                                src={msg.imageUrl}
                                                alt="Message attachment"
                                                className="mb-2 max-h-64 rounded-xl object-cover"
                                            />
                                        )}
                                        {msg.content && (
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        )}
                                        <div className={`text-[10px] mt-1 text-right ${isMeMock ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                            {format(new Date(msg.createdAt), "HH:mm")}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {isOtherTyping && (
                        <div className="flex justify-start">
                            <div className="flex items-center gap-1 rounded-2xl rounded-tl-none bg-muted px-4 py-3 shadow-sm">
                                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Scroll-to-bottom button */}
            {showScrollButton && (
                <div className="relative h-0">
                    <button
                        onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
                        aria-label="Scroll to latest message"
                    >
                        <ChevronDown className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-card">
                {selectedImage && (
                    <div className="mb-3 w-fit max-w-[180px] overflow-hidden rounded-xl border border-border bg-muted">
                        <div className="relative">
                            <img
                                src={selectedImage}
                                alt="Selected attachment"
                                className="max-h-32 w-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={removeImage}
                                className="absolute right-1.5 top-1.5 rounded-full bg-foreground/70 p-1 text-background"
                                aria-label="Remove image"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                )}
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isLoading}
                        className="rounded-xl h-10 w-10 shrink-0"
                    >
                        <ImagePlus className="h-4 w-4" />
                    </Button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => { setNewMessage(e.target.value); sendTyping(); }}
                        placeholder="Type a message..."
                        className="flex-1 rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={(!newMessage.trim() && !selectedImageFile) || isLoading}
                        className="rounded-xl h-10 w-10 shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
