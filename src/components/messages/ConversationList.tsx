import { formatDistanceToNow } from "date-fns";
import { CheckCheck, Users } from "lucide-react";
import type { Conversation } from "@/types/message";
import { useAuth } from "@/contexts";

interface ConversationListProps {
    conversations: Conversation[];
    selectedId?: string;
    onSelect: (conversation: Conversation) => void;
    onNewGroup?: () => void;
}

export function ConversationList({ conversations, selectedId, onSelect, onNewGroup }: ConversationListProps) {
    const { user } = useAuth();

    // Helper to get the other participant in 1:1 chats
    const getDisplayInfo = (conversation: Conversation) => {
        if (conversation.isGroup) {
            return {
                name: conversation.groupName || 'Group Chat',
                avatar: conversation.groupAvatar || '👥',
                isOnline: false,
            };
        }

        // Find the participant that isn't the current user
        const otherParticipant = conversation.participants.find(p => p.id !== user?.id) || conversation.participants[0];

        return {
            name: otherParticipant?.displayName || 'Unknown User',
            avatar: otherParticipant?.avatarUrl,
            // In a real app, you'd check online status from a presence service
            isOnline: false,
            initial: otherParticipant?.displayName?.[0] || '?'
        };
    };

    return (
        <div className="flex flex-col h-full bg-card border-r border-border">
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-xl font-bold">Messages</h2>
                {onNewGroup && (
                    <button
                        onClick={onNewGroup}
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        aria-label="New group"
                    >
                        <Users className="h-4 w-4" />
                        New Group
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        No messages yet.
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {conversations.map((convo) => {
                            const info = getDisplayInfo(convo);
                            const isSelected = selectedId === convo.id;

                            return (
                                <button
                                    key={convo.id}
                                    onClick={() => onSelect(convo)}
                                    className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50 ${isSelected ? "bg-muted" : ""
                                        }`}
                                >
                                    {/* Avatar */}
                                    <div className="relative shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-lg font-semibold text-primary-foreground">
                                        {info.avatar && info.avatar.startsWith('http') ? (
                                            <img
                                                src={info.avatar}
                                                alt={info.name}
                                                className="h-12 w-12 rounded-full object-cover"
                                            />
                                        ) : conversation.isGroup ? (
                                            <Users className="h-5 w-5" />
                                        ) : (
                                            info.initial
                                        )}

                                        {info.isOnline && (
                                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="font-medium text-foreground truncate">
                                                {info.name}
                                            </span>
                                            {convo.lastMessage && (
                                                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                                    {formatDistanceToNow(new Date(convo.lastMessage.createdAt), { addSuffix: true })}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {convo.lastMessage?.senderId === user?.id && (
                                                <CheckCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                                            )}
                                            <p className={`text-sm truncate ${convo.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                                                {convo.lastMessage?.content || "No messages yet"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Unread badge */}
                                    {convo.unreadCount > 0 && (
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                                            {convo.unreadCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
