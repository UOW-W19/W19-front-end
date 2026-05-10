import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Send, MoreVertical, Phone, Video, ImagePlus, X, ChevronDown, Download, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import type { Conversation, Message } from "@/types/message";
import { useAuth } from "@/contexts";
import { Button } from "@/components/ui/button";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface ChatWindowProps {
    conversation: Conversation;
    messages: Message[];
    onSendMessage: (content: string, image?: File) => Promise<void>;
    onDeleteMessage?: (messageId: string) => void;
    onLeaveGroup?: (conversationId: string) => void;
    onUpdateGroup?: (conversationId: string, groupName: string) => void;
    onBack?: () => void;
    isLoading?: boolean;
}

export function ChatWindow({ conversation, messages, onSendMessage, onDeleteMessage, onLeaveGroup, onUpdateGroup, onBack, isLoading }: ChatWindowProps) {
    const { user } = useAuth();
    const [newMessage, setNewMessage] = useState("");
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [showMediaPanel, setShowMediaPanel] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [renamingGroup, setRenamingGroup] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const prevConvIdRef = useRef<string>(conversation.id);
    const hasScrolledInitiallyRef = useRef(false);
    const visibleMessages = useMemo(
        () => messages.filter((msg, index, all) => all.findIndex(m => m.id === msg.id) === index),
        [messages],
    );

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
        if (isNewConversation) {
            prevConvIdRef.current = conversation.id;
            hasScrolledInitiallyRef.current = false;
        }

        if (!hasScrolledInitiallyRef.current && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
            hasScrolledInitiallyRef.current = true;
        } else if (hasScrolledInitiallyRef.current && isNearBottom()) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [conversation.id, messages.length, visibleMessages.length]);

    useEffect(() => {
        return () => {
            if (selectedImage) {
                URL.revokeObjectURL(selectedImage);
            }
        };
    }, [selectedImage]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedImageFile) return;
        setSendError(null);
        try {
            await onSendMessage(newMessage, selectedImageFile || undefined);
            setNewMessage("");
            setSelectedImage(null);
            setSelectedImageFile(null);
            if (imageInputRef.current) {
                imageInputRef.current.value = "";
            }
        } catch {
            setSendError("Failed to send. Please try again.");
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

    const handleDownload = async (url: string) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = objectUrl;
            a.download = url.split("/").pop() || "image";
            a.click();
            URL.revokeObjectURL(objectUrl);
        } catch {
            window.open(url, "_blank");
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

    const { isOtherTyping, typingDisplayName, sendTyping } = useTypingIndicator(conversation.id, user?.id ?? '');

    const info = getDisplayInfo();

    return (
        <div className="relative flex flex-col h-full bg-background">
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
                        ) : conversation.isGroup ? (
                            <Users className="h-5 w-5" />
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
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setShowMediaPanel(v => !v)}
                        aria-label="View attachments"
                    >
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
                <div className="flex flex-col justify-end min-h-full space-y-4">
                    {visibleMessages.map((msg, index) => {
                        // Fix: for mock data 'current-user' comparison
                        const isMeMock = msg.senderId === 'current-user' || msg.senderId === user?.id;

                        const showAvatar = index === 0 || visibleMessages[index - 1].senderId !== msg.senderId;
                        const sender = conversation.participants.find(p => p.id === msg.senderId);
                        const senderName = msg.senderDisplayName || sender?.displayName || (isMeMock ? user?.displayName : undefined) || "Unknown User";
                        const senderAvatar = msg.senderAvatarUrl || sender?.avatarUrl || (isMeMock ? user?.avatarUrl : undefined);
                        const senderInitial = senderName[0] ?? '?';

                        return (
                            <div
                                key={msg.id}
                                className={`flex w-full ${isMeMock ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`group flex max-w-[70%] gap-2 ${isMeMock ? "flex-row-reverse" : "flex-row"}`}>

                                    <div className="w-8 shrink-0">
                                        {showAvatar && (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-semibold text-primary-foreground">
                                                {senderAvatar ? (
                                                    <img
                                                        src={senderAvatar}
                                                        alt={senderName}
                                                        className="h-8 w-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    senderInitial
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-0.5">
                                        {conversation.isGroup && !isMeMock && showAvatar && (
                                            <span className="text-[11px] text-muted-foreground font-medium pl-1">{senderName}</span>
                                        )}
                                        <div
                                            className={`rounded-2xl px-4 py-2 shadow-sm ${isMeMock
                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                : "bg-muted text-foreground rounded-tl-none"
                                                }`}
                                        >
                                            {msg.imageUrl && (
                                                <button
                                                    onClick={() => setLightboxImage(msg.imageUrl!)}
                                                    className="block mb-2 cursor-zoom-in"
                                                >
                                                    <img
                                                        src={msg.imageUrl}
                                                        alt="Message attachment"
                                                        className="max-h-64 rounded-xl object-cover hover:opacity-90 transition-opacity"
                                                    />
                                                </button>
                                            )}
                                            {msg.content && (
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                            )}
                                            <div className={`text-[10px] mt-1 text-right ${isMeMock ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                                {format(new Date(msg.createdAt), "HH:mm")}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delete button — own messages only, visible on hover */}
                                    {isMeMock && onDeleteMessage && (
                                        <button
                                            onClick={() => onDeleteMessage(msg.id)}
                                            className="self-center opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            aria-label="Delete message"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {isOtherTyping && (
                        <div className="flex justify-start">
                            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-none bg-muted px-4 py-3 shadow-sm">
                                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                                {typingDisplayName && (
                                    <span className="ml-1 text-xs text-muted-foreground">
                                        {typingDisplayName} is typing...
                                    </span>
                                )}
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

            {/* Side panel — group info (when group) + media attachments */}
            {showMediaPanel && (
                <div className="absolute inset-y-0 right-0 w-full sm:w-72 bg-card border-l border-border flex flex-col z-20 shadow-xl">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                        <h4 className="font-semibold text-sm">
                            {conversation.isGroup ? "Group Info" : "Media & Attachments"}
                        </h4>
                        <Button variant="ghost" size="icon" onClick={() => setShowMediaPanel(false)} aria-label="Close panel">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {/* Group-specific section */}
                        {conversation.isGroup && (
                            <div className="p-4 border-b border-border space-y-3">
                                {/* Rename */}
                                {renamingGroup ? (
                                    <div className="flex gap-2">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={renameValue}
                                            onChange={e => setRenameValue(e.target.value)}
                                            maxLength={60}
                                            className="flex-1 rounded-lg border border-input bg-muted px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                        <Button
                                            size="sm"
                                            className="rounded-lg"
                                            onClick={() => {
                                                if (renameValue.trim() && onUpdateGroup) {
                                                    onUpdateGroup(conversation.id, renameValue.trim());
                                                }
                                                setRenamingGroup(false);
                                            }}
                                        >Save</Button>
                                        <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setRenamingGroup(false)}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => { setRenameValue(conversation.groupName || ""); setRenamingGroup(true); }}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Rename group
                                    </button>
                                )}

                                {/* Members list */}
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Members ({conversation.participants.length})
                                </p>
                                <div className="space-y-2">
                                    {conversation.participants.map(p => (
                                        <div key={p.id} className="flex items-center gap-2">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-semibold text-primary-foreground">
                                                {p.avatarUrl ? (
                                                    <img src={p.avatarUrl} alt={p.displayName} className="h-7 w-7 rounded-full object-cover" />
                                                ) : (
                                                    p.displayName?.[0] || '?'
                                                )}
                                            </div>
                                            <span className="flex-1 text-sm truncate">{p.displayName}</span>
                                            {p.id === user?.id && (
                                                <span className="text-[10px] text-muted-foreground">You</span>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Leave group */}
                                {onLeaveGroup && (
                                    <button
                                        onClick={() => { setShowMediaPanel(false); onLeaveGroup(conversation.id); }}
                                        className="w-full text-sm text-destructive hover:bg-destructive/10 rounded-lg py-1.5 transition-colors"
                                    >
                                        Leave Group
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Attachments grid */}
                        <div className="p-3">
                            {!conversation.isGroup && (
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Media &amp; Attachments</p>
                            )}
                            {messages.filter(m => m.imageUrl).length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center mt-6">No attachments yet</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {messages.filter(m => m.imageUrl).map(msg => (
                                        <button
                                            key={msg.id}
                                            onClick={() => setLightboxImage(msg.imageUrl!)}
                                            className="group relative aspect-square overflow-hidden rounded-lg border border-border hover:ring-2 hover:ring-primary transition-all"
                                        >
                                            <img
                                                src={msg.imageUrl!}
                                                alt="Attachment"
                                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                                            />
                                            <div className="absolute bottom-0 inset-x-0 bg-black/40 px-1.5 py-0.5 text-[10px] text-white text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                {format(new Date(msg.createdAt), "MMM d")}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {lightboxImage && (
                <div
                    className="absolute inset-0 bg-black/85 flex items-center justify-center z-30"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                        <button
                            className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20 transition-colors"
                            onClick={e => { e.stopPropagation(); handleDownload(lightboxImage); }}
                            aria-label="Download image"
                        >
                            <Download className="h-5 w-5" />
                        </button>
                        <button
                            className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20 transition-colors"
                            onClick={() => setLightboxImage(null)}
                            aria-label="Close image"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <img
                        src={lightboxImage}
                        alt="Full size attachment"
                        className="max-w-[92%] max-h-[92%] object-contain rounded-lg shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    />
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
                        onChange={(e) => { setNewMessage(e.target.value); sendTyping(); if (sendError) setSendError(null); }}
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
                {sendError && (
                    <p className="mt-1.5 text-xs text-destructive">{sendError}</p>
                )}
            </div>
        </div>
    );
}
