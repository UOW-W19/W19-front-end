import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';
import type {
    Conversation,
    Message,
    CreateMessageRequest,
    BackendConversation,
    BackendConversationParticipant,
    BackendMessage,
    BackendPaginatedResponse
} from '@/types/message';
import type { UserProfile } from '@/types/api';

// ============ TRANSFORMATIONS ============

const transformMessage = (m: BackendMessage): Message => ({
    id: String(m.id),
    conversationId: String(m.conversationId),
    senderId: String(m.sender.id),
    content: m.content || '',
    imageUrl: m.imageUrl || m.image_url,
    createdAt: m.createdAt,
    isRead: m.isRead,
});

const transformConversation = (c: BackendConversation): Conversation => ({
    id: String(c.id),
    participants: c.participants.map((p: BackendConversationParticipant) => ({
        id: String(p.id),
        email: p.email || '',
        username: p.username || p.display_name?.toLowerCase().replace(/\s+/g, '_') || 'user',
        displayName: p.displayName || p.display_name || p.username || 'Unknown User',
        avatarUrl: p.avatarUrl || p.avatar_url,
    })) as UserProfile[],
    unreadCount: c.unreadCount || 0,
    updatedAt: c.lastMessageAt || c.updatedAt,
    isGroup: false, // Default to false
    lastMessage: {
        id: 'last-' + c.id,
        content: c.lastMessagePreview,
        createdAt: c.lastMessageAt || c.updatedAt,
        conversationId: String(c.id),
        senderId: '', // Preview DTO doesn't explicitly have senderId
        isRead: true
    } as Message
});

// ============ API IMPLEMENTATION ============

const apiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const token = getStoredToken();
    const isMultipart = options.body instanceof FormData;
    const headers: HeadersInit = {
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
    };
    if (!isMultipart) {
        (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

    if (!response.ok) {
        throw new Error(`Api request failed: ${response.statusText}`);
    }

    // Handles 204 No Content
    if (response.status === 204) return {} as T;

    return response.json();
};

const buildMessageFormData = (data: { content?: string; image?: File; recipientId?: string }) => {
    const formData = new FormData();

    if (data.recipientId !== undefined) {
        formData.append('recipientId', data.recipientId);
    }
    if (data.content !== undefined && data.content.trim()) {
        formData.append('content', data.content.trim());
    }
    if (data.image) {
        formData.append('image', data.image);
    }

    return formData;
};

export const messagesApi = {
    getConversations: async (page = 0, size = 20): Promise<Conversation[]> => {
        try {
            const response = await apiRequest<BackendPaginatedResponse<BackendConversation> | BackendConversation[]>(
                `/conversations?page=${page}&size=${size}`
            );

            const data = Array.isArray(response) ? response : response.content;
            return data.map(transformConversation);
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
            return [];
        }
    },

    getMessages: async (conversationId: string, page = 0, size = 50): Promise<Message[]> => {
        try {
            const response = await apiRequest<BackendPaginatedResponse<BackendMessage> | BackendMessage[]>(
                `/conversations/${conversationId}/messages?page=${page}&size=${size}`
            );

            const data = Array.isArray(response) ? response : response.content;
            return data.map(transformMessage).reverse();
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            return [];
        }
    },

    sendMessage: async (data: CreateMessageRequest): Promise<Message> => {
        const response = await apiRequest<BackendMessage>(`/conversations/${data.conversationId}/messages`, {
            method: 'POST',
            body: buildMessageFormData({
                content: data.content,
                image: data.image,
            }),
        });
        return transformMessage(response);
    },

    /**
     * Start a new conversation with a recipient
     */
    startConversation: async (recipientId: string, content = "Hello!", image?: File): Promise<Message> => {
        const response = await apiRequest<BackendMessage>('/conversations', {
            method: 'POST',
            body: buildMessageFormData({
                recipientId: recipientId,
                content: content,
                image,
            }),
        });
        return transformMessage(response);
    },

    markAsRead: async (conversationId: string): Promise<void> => {
        await apiRequest<void>(`/conversations/${conversationId}/read`, {
            method: 'POST'
        });
    }
};
