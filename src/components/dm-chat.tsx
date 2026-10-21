"use client";

import { useEffect, useRef, useState } from "react";
import { sendDMMessage } from "@/app/actions/dm-messages";
import { createClient } from "@/lib/supabase/client";
import { Send, Loader2 } from "lucide-react";
import type { Message } from "@/lib/types";

export function DMChat({
  conversationId,
  initialMessages,
  channelId: initialChannelId,
  currentUserId,
}: {
  conversationId: string;
  initialMessages: Message[];
  channelId: string | null;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [channelId, setChannelId] = useState(initialChannelId);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!channelId) return;
    const supabase = createClient();
    const ch = supabase
      .channel(`dm:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .eq("id", newMsg.author_id)
            .single();

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [
              ...prev,
              {
                id: newMsg.id,
                channel_id: newMsg.channel_id,
                author_id: newMsg.author_id,
                content: newMsg.content,
                created_at: newMsg.created_at,
                edited_at: newMsg.edited_at,
                deleted_at: newMsg.deleted_at,
                author: profile || undefined,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [channelId]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    const result = await sendDMMessage(conversationId, trimmed);
    if (result.error) {
      alert(result.error);
    } else {
      setContent("");
      if (result.channelId) setChannelId(result.channelId);
    }
    setLoading(false);
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Say hi!
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.author_id === currentUserId ? "justify-end" : ""}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                msg.author_id === currentUserId
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <p
                className={`text-[10px] mt-1 ${
                  msg.author_id === currentUserId
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
              >
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="p-3 border-t border-border flex gap-2 items-end"
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Message…"
          rows={1}
          className="flex-1 px-3 py-2.5 rounded-xl bg-background border border-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </>
  );
}
