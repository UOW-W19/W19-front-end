import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatWindow } from "@/components/messages/ChatWindow";
import { CreateGroupModal } from "@/components/messages/CreateGroupModal";
import { messagesApi } from "@/services/api/messages";
import type { Conversation, Message } from "@/types/message";
import { useAuth } from "@/contexts";
import { useChatSubscription } from "@/hooks/useChatSubscription";

const appendUniqueMessage = (messages: Message[], newMessage: Message) => {
  if (messages.some(m => m.id === newMessage.id)) return messages;
  return [...messages, newMessage];
};

export default function MessagesPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const startingForUserRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
  };

  // Fetch conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesApi.getConversations(),
    refetchInterval: 10000,
  });

  const conversationIds = useMemo(() => conversations.map(c => c.id), [conversations]);
  useChatSubscription(conversationIds, selectedConversationId);

  // Fetch messages for selected conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: () => selectedConversationId ? messagesApi.getMessages(selectedConversationId) : Promise.resolve([]),
    enabled: !!selectedConversationId,
    refetchInterval: 60000,
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => {
      if (!selectedConversationId) throw new Error("No conversation selected");
      return messagesApi.deleteMessage(selectedConversationId, messageId);
    },
    onSuccess: (_data, messageId) => {
      queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) =>
        old.filter(m => m.id !== messageId)
      );
    },
  });

  // Group mutations
  const createGroupMutation = useMutation({
    mutationFn: ({ groupName, participantIds }: { groupName: string; participantIds: string[] }) =>
      messagesApi.createGroup(groupName, participantIds),
    onSuccess: (newConversation) => {
      queryClient.setQueryData(['conversations'], (old: typeof conversations) =>
        [newConversation, ...(old || [])]
      );
      setSelectedConversationId(newConversation.id);
      setShowCreateGroup(false);
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: (conversationId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      return messagesApi.removeParticipant(conversationId, user.id);
    },
    onSuccess: (_data, conversationId) => {
      queryClient.setQueryData(['conversations'], (old: typeof conversations) =>
        (old || []).filter(c => c.id !== conversationId)
      );
      if (selectedConversationId === conversationId) setSelectedConversationId(null);
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ conversationId, groupName }: { conversationId: string; groupName: string }) =>
      messagesApi.updateGroup(conversationId, groupName),
    onSuccess: (updated) => {
      queryClient.setQueryData(['conversations'], (old: typeof conversations) =>
        (old || []).map(c => c.id === updated.id ? { ...c, groupName: updated.groupName } : c)
      );
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ content, image }: { content: string; image?: File }) => {
      if (!selectedConversationId) throw new Error("No conversation selected");
      return messagesApi.sendMessage({ conversationId: selectedConversationId, content, image });
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) => {
        return appendUniqueMessage(old, newMessage);
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Handle starting a conversation from profile page (?user=userId)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userId = params.get('user');

    if (!userId || loadingConversations) return;

    // Already handling this user — prevent duplicate calls
    if (startingForUserRef.current === userId) return;

    // Check if conversation already exists in the loaded list
    const existing = conversations.find(c =>
      !c.isGroup && c.participants.some(p => p.id === userId)
    );

    if (existing) {
      setSelectedConversationId(existing.id);
      navigate('/messages', { replace: true });
      return;
    }

    // Mark as in-progress before the async call
    startingForUserRef.current = userId;
    setIsStartingChat(true);

    messagesApi.findOrCreateDm(userId)
      .then(async (conversation) => {
        await queryClient.refetchQueries({ queryKey: ['conversations'] });
        setSelectedConversationId(conversation.id);
      })
      .catch(err => {
        console.error("Failed to open conversation:", err);
      })
      .finally(() => {
        startingForUserRef.current = null;
        setIsStartingChat(false);
        navigate('/messages', { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, loadingConversations]);

  // Mark as read when selecting a conversation
  useEffect(() => {
    if (selectedConversationId) {
      messagesApi.markAsRead(selectedConversationId);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  }, [selectedConversationId, queryClient]);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  // Unique participants from DM conversations (excluding self) for group creation
  const groupCandidates = useMemo(() => {
    const seen = new Set<string>();
    return conversations
      .filter(c => !c.isGroup)
      .flatMap(c => c.participants)
      .filter(p => {
        if (p.id === user?.id || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
  }, [conversations, user?.id]);

  // Determine view state for mobile
  const showChat = !!selectedConversationId;
  const isChatLoading = isStartingChat || (!!selectedConversationId && !selectedConversation);

  return (
    <div className="h-full flex overflow-hidden bg-background">
      {showCreateGroup && (
        <CreateGroupModal
          candidates={groupCandidates}
          onClose={() => setShowCreateGroup(false)}
          onCreated={(groupName, participantIds) => createGroupMutation.mutate({ groupName, participantIds })}
          isLoading={createGroupMutation.isPending}
        />
      )}
      {/* Sidebar - Conversation List */}
      <div className={`
        ${showChat ? 'hidden lg:flex' : 'flex'} 
        w-full lg:w-80 xl:w-96 flex-col border-r border-border shrink-0 h-full overflow-y-auto scrollbar-thin
      `}>
        {loadingConversations ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversationId || undefined}
            onSelect={handleSelectConversation}
            onNewGroup={() => setShowCreateGroup(true)}
          />
        )}
      </div>

      {/* Main Area - Chat Window */}
      {/* Mobile: Full screen fixed overlay. Desktop: Normal flex child. */}
      {isChatLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Opening conversation...</p>
        </div>
      ) : selectedConversation && showChat ? (
        <div className="fixed inset-0 z-[100] bg-background lg:static lg:flex-1 lg:flex lg:flex-col lg:h-full lg:z-auto">
          <ChatWindow
            conversation={selectedConversation}
            messages={messages}
            isLoading={sendMessageMutation.isPending}
            onSendMessage={async (content, image) => { await sendMessageMutation.mutateAsync({ content, image }); }}
            onDeleteMessage={(messageId) => deleteMessageMutation.mutate(messageId)}
            onLeaveGroup={(conversationId) => leaveGroupMutation.mutate(conversationId)}
            onUpdateGroup={(conversationId, groupName) => updateGroupMutation.mutate({ conversationId, groupName })}
            onBack={() => setSelectedConversationId(null)}
          />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-muted-foreground p-8 bg-muted/10">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <span className="text-3xl">💬</span>
          </div>
          <h3 className="text-lg font-medium text-foreground">Your Messages</h3>
          <p className="max-w-xs text-center mt-2">
            Select a conversation from the list to start chatting.
          </p>
        </div>
      )}
    </div>
  );
}
