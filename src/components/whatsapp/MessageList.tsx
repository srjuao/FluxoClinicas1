import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, ChevronDown } from "lucide-react";
import type { WhatsAppMessage } from "@/types/whatsapp.types";
import { MessageBubble } from "./MessageBubble";
import { formatDateSeparator, groupMessagesByDate } from "@/lib/whatsappUtils";

interface MessageListProps {
  messages: WhatsAppMessage[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onMediaClick?: (url: string, type: string) => void;
}

export function MessageList({
  messages,
  loading = false,
  hasMore = false,
  onLoadMore,
  onMediaClick,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const prevMessagesLength = useRef(messages.length);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setNewMessageCount(0);
    } else if (messages.length > prevMessagesLength.current) {
      setNewMessageCount((prev) => prev + (messages.length - prevMessagesLength.current));
    }
    prevMessagesLength.current = messages.length;
  }, [messages, autoScroll]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setAutoScroll(true);
      setNewMessageCount(0);
    }
  };

  // Handle scroll events
  const handleScroll = () => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isAtBottom);
    if (isAtBottom) setNewMessageCount(0);

    // Load more when scrolled to top
    if (scrollTop === 0 && hasMore && onLoadMore && !loading) {
      onLoadMore();
    }
  };

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages);
  const sortedDates = Array.from(groupedMessages.keys()).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  if (messages.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6">
        <MessageSquare className="w-16 h-16 mb-4 text-gray-400" />
        <p className="text-center text-lg">Nenhuma mensagem ainda</p>
        <p className="text-sm text-center mt-2">
          Envie uma mensagem para iniciar a conversa
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto p-4 bg-gray-50"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1d5db' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}
    >
      {/* Loading indicator at top */}
      {loading && hasMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-green-500" />
        </div>
      )}

      {/* Messages grouped by date */}
      {sortedDates.map((dateKey) => {
        const dateMessages = groupedMessages.get(dateKey) || [];
        const firstMessage = dateMessages[0];

        return (
          <div key={dateKey}>
            {/* Date separator */}
            <div className="flex justify-center my-4">
              <div className="bg-white px-3 py-1 rounded-full shadow-sm text-xs text-gray-600">
                {formatDateSeparator(firstMessage.timestamp)}
              </div>
            </div>

            {/* Messages for this date */}
            {dateMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onMediaClick={onMediaClick}
              />
            ))}
          </div>
        );
      })}

      {/* Initial loading */}
      {loading && messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        </div>
      )}
    </div>

    {/* Scroll to bottom FAB */}
    {!autoScroll && (
      <button
        onClick={scrollToBottom}
        className="absolute bottom-4 right-4 bg-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-colors z-10"
      >
        <ChevronDown className="w-5 h-5 text-gray-600" />
        {newMessageCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {newMessageCount > 99 ? "99+" : newMessageCount}
          </span>
        )}
      </button>
    )}
    </div>
  );
}
