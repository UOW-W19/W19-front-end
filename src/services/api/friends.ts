// Friends API Service
import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';
import type { FriendRequestResponse, FriendStatus } from '@/types/api';
import type { BackendPublicProfile, PublicUserProfile } from './users';
import { transformPublicProfile } from './users';

// ── Backend snake_case shape ────────────────────────────────────────────
interface BackendFriendRequest {
    id: string;
    status: FriendStatus;
    is_sent_by_me: boolean;
    other_user: {
        id: string;
        username: string;
        display_name: string;
        avatar_url?: string;
    };
    created_at: string;
}

interface BackendPagedResponse<T> {
    content: T[];
    last: boolean;
    number?: number;
    total_elements?: number;
}

// ── Helper ──────────────────────────────────────────────────────────────
const apiRequest = async <T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> => {
    const token = getStoredToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 204) return null as T;

    if (!response.ok) {
        let msg = 'Request failed';
        try {
            const err = await response.json();
            msg = err.message || err.error || msg;
        } catch {
            msg = response.statusText || msg;
        }
        throw new Error(msg);
    }

    const ct = response.headers.get('content-type');
    if (!ct?.includes('application/json')) return null as T;
    return response.json();
};

// ── Transform ────────────────────────────────────────────────────────────
const transform = (r: BackendFriendRequest): FriendRequestResponse => ({
    id: r.id,
    status: r.status,
    isSentByMe: r.is_sent_by_me,
    otherUser: {
        id: r.other_user.id,
        username: r.other_user.username,
        displayName: r.other_user.display_name,
        avatarUrl: r.other_user.avatar_url,
    },
    createdAt: r.created_at,
});

// ── Public API ────────────────────────────────────────────────────────────
export const friendsApi = {
    /**
     * Send a friend request to another user.
     * Returns the new FriendRequestResponse (status = PENDING).
     */
    async sendFriendRequest(userId: string): Promise<FriendRequestResponse> {
        const raw = await apiRequest<BackendFriendRequest>(
            `/users/${userId}/friend-request`,
            { method: 'POST' }
        );
        return transform(raw);
    },

    /**
     * Accept or reject a pending incoming friend request.
     * @param friendId - the ID of the Friend record (from FriendRequestResponse.id)
     * @param action   - 'accept' | 'reject'
     */
    async respondToRequest(
        friendId: string,
        action: 'accept' | 'reject'
    ): Promise<FriendRequestResponse> {
        const raw = await apiRequest<BackendFriendRequest>(
            `/users/me/friend-requests/${friendId}?action=${action}`,
            { method: 'PATCH' }
        );
        return transform(raw);
    },

    /**
     * Remove an existing friendship.
     */
    async removeFriend(userId: string): Promise<void> {
        await apiRequest<null>(`/users/${userId}/friend`, { method: 'DELETE' });
    },

    /**
     * Get the friendship status between the current user and another user.
     * Returns null if there is no relationship (204 response).
     */
    async getFriendStatus(userId: string): Promise<FriendRequestResponse | null> {
        const raw = await apiRequest<BackendFriendRequest | null>(
            `/users/${userId}/friend-status`
        );
        return raw ? transform(raw) : null;
    },

    /**
     * List all accepted friends of a given user (paginated).
     */
    async getFriends(
        userId: string,
        page = 0
    ): Promise<{ friends: PublicUserProfile[]; hasMore: boolean }> {
        const raw = await apiRequest<BackendPagedResponse<BackendPublicProfile>>(
            `/users/${userId}/friends?page=${page}&size=20`
        );
        return {
            friends: (raw.content ?? []).map(transformPublicProfile),
            hasMore: !raw.last,
        };
    },

    /**
     * List pending friend requests sent to the current user.
     */
    async getIncomingRequests(
        page = 0
    ): Promise<{ requests: FriendRequestResponse[]; hasMore: boolean; total: number }> {
        const raw = await apiRequest<BackendPagedResponse<BackendFriendRequest>>(
            `/users/me/friend-requests/incoming?page=${page}&size=20`
        );
        return {
            requests: (raw.content ?? []).map(transform),
            hasMore: !raw.last,
            total: raw.total_elements ?? raw.content?.length ?? 0,
        };
    },

    /**
     * List pending friend requests sent by the current user.
     */
    async getOutgoingRequests(
        page = 0
    ): Promise<{ requests: FriendRequestResponse[]; hasMore: boolean }> {
        const raw = await apiRequest<BackendPagedResponse<BackendFriendRequest>>(
            `/users/me/friend-requests/outgoing?page=${page}&size=20`
        );
        return {
            requests: (raw.content ?? []).map(transform),
            hasMore: !raw.last,
        };
    },
};
