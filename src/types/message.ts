import type { UserProfile } from './api';

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    senderDisplayName?: string;
    senderAvatarUrl?: string;
    content: string;
    imageUrl?: string;
    createdAt: string;
    isRead: boolean;
    // Optional: support for attachments in the future
    attachments?: {
        type: 'image' | 'file';
        url: string;
    }[];
}

export interface Conversation {
    id: string;
    participants: UserProfile[];
    lastMessage?: Message;
    unreadCount: number;
    updatedAt: string;
    isGroup: boolean;
    groupName?: string;
    groupAvatar?: string;
}

export interface CreateMessageRequest {
    conversationId: string;
    content: string;
    image?: File;
}

// Backend DTOs matching the Spring Boot ProfileResponse/MessageResponse
export interface BackendMessage {
    id: string;
    conversationId: string;
    sender: BackendConversationParticipant; // Backend sends the sender profile in MessageResponse
    content: string;
    image_url?: string;
    imageUrl?: string;
    isRead: boolean;
    createdAt: string;
}

export interface BackendConversation {
    id: string;
    participants: BackendConversationParticipant[];
    isGroup: boolean;
    groupName?: string;
    groupAvatar?: string;
    group_avatar?: string;
    lastMessagePreview: string;
    lastMessageAt: string;
    unreadCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface BackendConversationParticipant {
    id: string | number;
    email?: string;
    username?: string;
    displayName?: string;
    display_name?: string;
    avatarUrl?: string;
    avatar_url?: string;
}

export interface BackendPaginatedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
