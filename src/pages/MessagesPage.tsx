import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatWindow } from "@/components/messages/ChatWindow";
import { messagesApi } from "@/services/api/messages";
import type { Message } from "@/types/message";

export default function MessagesPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const startingForUserRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesApi.getConversations(),
    refetchInterval: 10000,
  });

  // Fetch messages for selected conversation
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: () => selectedConversationId ? messagesApi.getMessages(selectedConversationId) : Promise.resolve([]),
    enabled: !!selectedConversationId,
    refetchInterval: 5000,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ content, image }: { content: string; image?: File }) => {
      if (!selectedConversationId) throw new Error("No conversation selected");
      return messagesApi.sendMessage({ conversationId: selectedConversationId, content, image });
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData(['messages', selectedConversationId], (old: Message[] = []) => {
        return [...old, newMessage];
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
      c.participants.some(p => p.id === userId)
    );

    if (existing) {
      setSelectedConversationId(existing.id);
      navigate('/messages', { replace: true });
      return;
    }

    // Mark as in-progress before the async call
    startingForUserRef.current = userId;
    setIsStartingChat(true);

    messagesApi.startConversation(userId)
      .then(async (newMsg) => {
        await queryClient.refetchQueries({ queryKey: ['conversations'] });
        setSelectedConversationId(newMsg.conversationId);
      })
      .catch(err => {
        console.error("Failed to start conversation:", err);
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

  // Determine view state for mobile
  const showChat = !!selectedConversationId;
  const isChatLoading = isStartingChat || (!!selectedConversationId && !selectedConversation);

  return (
    <div className="h-full flex overflow-hidden bg-background">
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
            onSelect={(conversation) => setSelectedConversationId(conversation.id)}
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
            onSendMessage={(content, image) => sendMessageMutation.mutate({ content, image })}
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
