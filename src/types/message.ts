import type { UserProfile } from './api';

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
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
}

// Backend DTOs matching the Spring Boot ProfileResponse/MessageResponse
export interface BackendMessage {
    id: string;
    conversationId: string;
    sender: UserProfile; // Backend sends the whole sender profile in MessageResponse
    content: string;
    isRead: boolean;
    createdAt: string;
}

export interface BackendConversation {
    id: string;
    participants: UserProfile[];
    lastMessagePreview: string;
    lastMessageAt: string;
    unreadCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface BackendPaginatedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}
