import { useState, useEffect, useCallback } from "react";
import { Info, X } from "lucide-react";
import { ChatList } from "./ChatList";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ContactInfo } from "./ContactInfo";
import { MediaPreviewModal } from "./MediaPreviewModal";
import { useWhatsAppChats } from "@/hooks/useWhatsAppChats";
import { useWhatsAppMessages } from "@/hooks/useWhatsAppMessages";
import { useWhatsAppRealtime } from "@/hooks/useWhatsAppRealtime";
import { whatsappClient } from "@/lib/whatsappClient";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

export function WhatsAppChatInterface() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{
    file: File;
    type: string;
  } | null>(null);
  const [sendingMedia, setSendingMedia] = useState(false);

  // Custom hooks
  const {
    chats,
    loading: chatsLoading,
    loadChats,
    updateChatInList,
  } = useWhatsAppChats();

  const {
    messages,
    loading: messagesLoading,
    hasMore,
    loadMore,
    sendMessage,
    sendMedia,
    addMessage,
  } = useWhatsAppMessages(selectedChatId);

  // Real-time updates
  useWhatsAppRealtime({
    chatId: selectedChatId,
    onNewMessage: addMessage,
    enabled: !!selectedChatId,
  });

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const handleSelectChat = useCallback((chatId: string) => {
    setSelectedChatId(chatId);
    setShowContactInfo(false);
  }, []);

  const handleSendText = useCallback(
    async (text: string) => {
      await sendMessage(text);
    },
    [sendMessage]
  );

  const handleSendMedia = useCallback(
    async (file: File, type: string) => {
      setMediaPreview({ file, type });
    },
    []
  );

  const handleConfirmSendMedia = useCallback(
    async (caption?: string) => {
      if (!mediaPreview) return;

      setSendingMedia(true);
      try {
        await sendMedia(mediaPreview.file, mediaPreview.type, caption);
        setMediaPreview(null);
      } catch (error) {
        // Error already handled in hook
      } finally {
        setSendingMedia(false);
      }
    },
    [mediaPreview, sendMedia]
  );

  const handleArchiveChat = useCallback(async () => {
    if (!selectedChatId) return;

    try {
      const currentChat = chats.find((c) => c.jid === selectedChatId);
      if (!currentChat) return;

      if (currentChat.archived) {
        await whatsappClient.unarchiveChat(selectedChatId);
        updateChatInList(selectedChatId, { archived: false });
        toast({ title: "Conversa desarquivada" });
      } else {
        await whatsappClient.archiveChat(selectedChatId);
        updateChatInList(selectedChatId, { archived: true });
        toast({ title: "Conversa arquivada" });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível arquivar a conversa",
        variant: "destructive",
      });
    }
  }, [selectedChatId, chats, updateChatInList]);

  const handleMuteChat = useCallback(async () => {
    if (!selectedChatId) return;

    try {
      const currentChat = chats.find((c) => c.jid === selectedChatId);
      if (!currentChat) return;

      if (currentChat.muted) {
        await whatsappClient.unmuteChat(selectedChatId);
        updateChatInList(selectedChatId, { muted: false });
        toast({ title: "Notificações ativadas" });
      } else {
        await whatsappClient.muteChat(selectedChatId);
        updateChatInList(selectedChatId, { muted: true });
        toast({ title: "Notificações silenciadas" });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível silenciar a conversa",
        variant: "destructive",
      });
    }
  }, [selectedChatId, chats, updateChatInList]);

  const handleDeleteChat = useCallback(async () => {
    if (!selectedChatId) return;

    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita."
    );
    if (!confirmed) return;

    try {
      await whatsappClient.deleteChat(selectedChatId);
      setSelectedChatId(null);
      await loadChats();
      toast({ title: "Conversa excluída" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conversa",
        variant: "destructive",
      });
    }
  }, [selectedChatId, loadChats]);

  const selectedChat = chats.find((c) => c.jid === selectedChatId) || null;

  return (
    <div className="flex h-full">
      {/* Chat List - Left Panel */}
      <div className="w-80 flex-shrink-0">
        <ChatList
          chats={chats}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectChat}
          loading={chatsLoading}
          onRefresh={loadChats}
        />
      </div>

      {/* Messages Area - Center Panel */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedChatId ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="font-semibold text-gray-900">
                  {selectedChat?.name || selectedChat?.phone || "Conversa"}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowContactInfo(!showContactInfo)}
                className="md:hidden"
              >
                {showContactInfo ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* Messages */}
            <MessageList
              messages={messages}
              loading={messagesLoading}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />

            {/* Input */}
            <MessageInput
              onSendText={handleSendText}
              onSendMedia={handleSendMedia}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">Selecione uma conversa</p>
              <p className="text-sm">
                Escolha uma conversa da lista para começar
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Contact Info - Right Panel */}
      <div
        className={`${
          showContactInfo ? "block" : "hidden"
        } md:block flex-shrink-0`}
      >
        <ContactInfo
          chat={selectedChat}
          onArchive={handleArchiveChat}
          onMute={handleMuteChat}
          onDelete={handleDeleteChat}
          onClose={() => setShowContactInfo(false)}
        />
      </div>

      {/* Media Preview Modal */}
      {mediaPreview && (
        <MediaPreviewModal
          file={mediaPreview.file}
          mediaType={mediaPreview.type as any}
          onSend={handleConfirmSendMedia}
          onCancel={() => setMediaPreview(null)}
          sending={sendingMedia}
        />
      )}
    </div>
  );
}
