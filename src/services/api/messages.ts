import { authenticatedRequest } from './request';
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
    senderDisplayName: m.sender.displayName || m.sender.display_name || m.sender.username,
    senderAvatarUrl: m.sender.avatarUrl || m.sender.avatar_url,
    content: m.content || '',
    imageUrl: m.imageUrl || m.image_url,
    createdAt: m.createdAt,
    isRead: m.isRead,
});

const dedupeMessages = (messages: Message[]) => {
    const seen = new Set<string>();
    return messages.filter(message => {
        if (seen.has(message.id)) return false;
        seen.add(message.id);
        return true;
    });
};

const transformConversation = (c: BackendConversation): Conversation => ({
    id: String(c.id),
    participants: c.participants.map((p: BackendConversationParticipant) => ({
        id: String(p.id),
        email: p.email || '',
        username: p.username || p.display_name?.toLowerCase().replace(/\s+/g, '_') || 'user',
        displayName: p.displayName || p.display_name || p.username || 'Unknown User',
        avatarUrl: p.avatarUrl || p.avatar_url,
    })) as UserProfile[],
    isGroup: c.isGroup || false,
    groupName: c.groupName,
    groupAvatar: c.groupAvatar || c.group_avatar,
    unreadCount: c.unreadCount || 0,
    updatedAt: c.lastMessageAt || c.updatedAt,
    lastMessage: {
        id: 'last-' + c.id,
        content: c.lastMessagePreview,
        createdAt: c.lastMessageAt || c.updatedAt,
        conversationId: String(c.id),
        senderId: '',
        senderDisplayName: '',
        senderAvatarUrl: undefined,
        isRead: true
    } as Message
});

// ============ API IMPLEMENTATION ============

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

const buildGroupFormData = (data: { groupName?: string; participantIds?: string[]; groupAvatarFile?: File }) => {
    const formData = new FormData();

    if (data.groupName !== undefined && data.groupName.trim()) {
        formData.append('groupName', data.groupName.trim());
    }
    data.participantIds?.forEach(participantId => {
        formData.append('participantIds', participantId);
    });
    if (data.groupAvatarFile) {
        formData.append('groupAvatar', data.groupAvatarFile);
    }

    return formData;
};

export const messagesApi = {
    getConversations: async (page = 0, size = 20): Promise<Conversation[]> => {
        const response = await authenticatedRequest<BackendPaginatedResponse<BackendConversation> | BackendConversation[]>(
            `/conversations?page=${page}&size=${size}`
        );
        const data = Array.isArray(response) ? response : response.content;
        return data.map(transformConversation);
    },

    getMessages: async (conversationId: string, page = 0, size = 50): Promise<Message[]> => {
        const response = await authenticatedRequest<BackendPaginatedResponse<BackendMessage> | BackendMessage[]>(
            `/conversations/${conversationId}/messages?page=${page}&size=${size}`
        );
        const data = Array.isArray(response) ? response : response.content;
        return dedupeMessages(data.map(transformMessage).reverse());
    },

    sendMessage: async (data: CreateMessageRequest): Promise<Message> => {
        const response = await authenticatedRequest<BackendMessage>(`/conversations/${data.conversationId}/messages`, {
            method: 'POST',
            body: buildMessageFormData({
                content: data.content,
                image: data.image,
            }),
        });
        return transformMessage(response);
    },

    findOrCreateDm: async (recipientId: string): Promise<Conversation> => {
        const response = await authenticatedRequest<BackendConversation>(
            `/conversations/dm?recipientId=${recipientId}`,
            { method: 'POST' }
        );
        return transformConversation(response);
    },

    startConversation: async (recipientId: string, content: string, image?: File): Promise<Message> => {
        if (!content?.trim() && !image) {
            throw new Error('Cannot start a conversation without message content or an image');
        }

        const response = await authenticatedRequest<BackendMessage>('/conversations', {
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
        await authenticatedRequest<void>(`/conversations/${conversationId}/read`, {
            method: 'POST'
        });
    },

    deleteMessage: async (conversationId: string, messageId: string): Promise<void> => {
        await authenticatedRequest<void>(`/conversations/${conversationId}/messages/${messageId}`, {
            method: 'DELETE'
        });
    },

    createGroup: async (groupName: string, participantIds: string[], groupAvatarFile?: File): Promise<Conversation> => {
        const response = await authenticatedRequest<BackendConversation>('/conversations/group', {
            method: 'POST',
            body: buildGroupFormData({ groupName, participantIds, groupAvatarFile }),
        });
        return transformConversation(response);
    },

    addParticipant: async (conversationId: string, profileId: string): Promise<Conversation> => {
        const response = await authenticatedRequest<BackendConversation>(
            `/conversations/${conversationId}/participants?profileId=${profileId}`,
            { method: 'POST' }
        );
        return transformConversation(response);
    },

    removeParticipant: async (conversationId: string, profileId: string): Promise<void> => {
        await authenticatedRequest<void>(`/conversations/${conversationId}/participants/${profileId}`, {
            method: 'DELETE'
        });
    },

    updateGroup: async (
        conversationId: string,
        data: { groupName?: string; groupAvatarFile?: File },
    ): Promise<Conversation> => {
        const response = await authenticatedRequest<BackendConversation>(`/conversations/${conversationId}`, {
            method: 'PATCH',
            body: buildGroupFormData(data),
        });
        return transformConversation(response);
    },
};
