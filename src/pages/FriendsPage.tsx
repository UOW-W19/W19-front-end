import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
    Users,
    UserCheck,
    Loader2,
    Check,
    X,
    MessageCircle,
    UserMinus,
    Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { friendsApi } from "@/services/api/friends";
import type { FriendRequestResponse } from "@/types/api";
import type { PublicUserProfile } from "@/services/api/users";

type Tab = "friends" | "requests";

function Avatar({
    url,
    name,
}: {
    url?: string;
    name: string;
}) {
    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    if (url) {
        return (
            <img
                src={url}
                alt={name}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-background"
            />
        );
    }
    return (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-base font-bold text-primary-foreground ring-2 ring-background">
            {initials}
        </div>
    );
}

export default function FriendsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>("friends");

    // — Friends list state —
    const [friends, setFriends] = useState<PublicUserProfile[]>([]);
    const [isFriendsLoading, setIsFriendsLoading] = useState(true);

    // — Requests state —
    const [requests, setRequests] = useState<FriendRequestResponse[]>([]);
    const [isRequestsLoading, setIsRequestsLoading] = useState(true);
    const [incomingTotal, setIncomingTotal] = useState(0);

    // — Per-row loading —
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    const loadFriends = useCallback(async () => {
        if (!user) return;
        setIsFriendsLoading(true);
        try {
            const { friends: list } = await friendsApi.getFriends(user.id);
            setFriends(list);
        } catch {
            // silently fail
        } finally {
            setIsFriendsLoading(false);
        }
    }, [user]);

    const loadRequests = useCallback(async () => {
        setIsRequestsLoading(true);
        try {
            const { requests: list, total } = await friendsApi.getIncomingRequests();
            setRequests(list);
            setIncomingTotal(total);
        } catch {
            // silently fail
        } finally {
            setIsRequestsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFriends();
        loadRequests();
    }, [loadFriends, loadRequests]);

    const handleRespond = async (
        friendId: string,
        action: "accept" | "reject"
    ) => {
        setProcessingIds((prev) => new Set(prev).add(friendId));
        try {
            await friendsApi.respondToRequest(friendId, action);
            setRequests((prev) => prev.filter((r) => r.id !== friendId));
            setIncomingTotal((prev) => Math.max(0, prev - 1));
            if (action === "accept") loadFriends();
        } catch {
            // silently fail
        } finally {
            setProcessingIds((prev) => {
                const next = new Set(prev);
                next.delete(friendId);
                return next;
            });
        }
    };

    const handleRemoveFriend = async (userId: string, friendRecordId: string) => {
        setProcessingIds((prev) => new Set(prev).add(friendRecordId));
        try {
            await friendsApi.removeFriend(userId);
            setFriends((prev) => prev.filter((f) => f.id !== friendRecordId));
        } catch {
            // silently fail
        } finally {
            setProcessingIds((prev) => {
                const next = new Set(prev);
                next.delete(friendRecordId);
                return next;
            });
        }
    };

    return (
        <div className="h-full overflow-y-auto pb-24 scrollbar-hide mx-auto max-w-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-border">
                <h1 className="text-xl font-bold text-foreground">Friends</h1>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border px-4">
                <button
                    onClick={() => setActiveTab("friends")}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === "friends"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Users className="h-4 w-4" />
                    Friends
                    {friends.length > 0 && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                            {friends.length}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab("requests")}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === "requests"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Bell className="h-4 w-4" />
                    Requests
                    {incomingTotal > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                            {incomingTotal}
                        </span>
                    )}
                </button>
            </div>

            <div className="px-4 py-4">
                {/* ─── Friends tab ───────────────────────────────────── */}
                {activeTab === "friends" && (
                    <>
                        {isFriendsLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : friends.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                    <UserCheck className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="font-semibold text-foreground">No friends yet</p>
                                <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                                    Visit someone's profile and tap <strong>Add Friend</strong> to
                                    get started.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {friends.map((fr) => (
                                    <div
                                        key={fr.id}
                                        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                                    >
                                        <Link to={`/user/${fr.id}`} className="shrink-0">
                                            <Avatar
                                                url={fr.avatarUrl}
                                                name={fr.displayName}
                                            />
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                to={`/user/${fr.id}`}
                                                className="font-semibold text-foreground hover:underline truncate block"
                                            >
                                                {fr.displayName}
                                            </Link>
                                            <p className="text-xs text-muted-foreground truncate">
                                                @{fr.username}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link to={`/messages?user=${fr.id}`}>
                                                    <MessageCircle className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                disabled={processingIds.has(fr.id)}
                                                onClick={() =>
                                                    handleRemoveFriend(fr.id, fr.id)
                                                }
                                            >
                                                {processingIds.has(fr.id) ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <UserMinus className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ─── Requests tab ──────────────────────────────────── */}
                {activeTab === "requests" && (
                    <>
                        {isRequestsLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                    <Bell className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="font-semibold text-foreground">No pending requests</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Friend requests will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {requests.map((req) => (
                                    <div
                                        key={req.id}
                                        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                                    >
                                        <Link to={`/user/${req.otherUser.id}`} className="shrink-0">
                                            <Avatar
                                                url={req.otherUser.avatarUrl}
                                                name={req.otherUser.displayName}
                                            />
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                to={`/user/${req.otherUser.id}`}
                                                className="font-semibold text-foreground hover:underline truncate block"
                                            >
                                                {req.otherUser.displayName}
                                            </Link>
                                            <p className="text-xs text-muted-foreground">
                                                wants to be friends
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                disabled={processingIds.has(req.id)}
                                                onClick={() => handleRespond(req.id, "accept")}
                                            >
                                                {processingIds.has(req.id) ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Check className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={processingIds.has(req.id)}
                                                onClick={() => handleRespond(req.id, "reject")}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
