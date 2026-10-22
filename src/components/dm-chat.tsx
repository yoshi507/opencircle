"use client";

import { useEffect, useRef, useState } from "react";
import { sendDMMessage, pollDMMessages } from "@/app/actions/dm-messages";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";
import { Loader2, Send } from "lucide-react";

export function DMChat({
  conversationId,
  initialMessages,
  channelId: _channelId,
  currentUserId,
}: {
  conversationId: string;
  initialMessages: Message[];
  channelId: string | null;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function mergeMessages(incoming: Message[]) {
    setMessages((prev) => {
      const map = new Map<string, Message>();
      for (const m of prev) map.set(m.id, m);
      for (const m of incoming) map.set(m.id, m);
      return Array.from(map.values()).sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }

  // Realtime + 3s poll fallback so both sides always sync
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const row = payload.new as any;
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .eq("id", row.author_id)
            .single();

          mergeMessages([
            {
              id: row.id,
              channel_id: conversationId,
              author_id: row.author_id,
              content: row.content,
              created_at: row.created_at,
              edited_at: row.edited_at,
              deleted_at: row.deleted_at,
              author: profile || undefined,
            },
          ]);
        }
      )
      .subscribe();

    const interval = setInterval(async () => {
      const latest = messages[messages.length - 1]?.created_at;
      const fresh = await pollDMMessages(conversationId, latest);
      if (fresh.length) mergeMessages(fresh as Message[]);
    }, 3000);

    // Initial full poll in case server render was empty
    pollDMMessages(conversationId).then((all) => {
      if (all.length) mergeMessages(all as Message[]);
    });

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    const result = await sendDMMessage(conversationId, trimmed);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.message) {
      const msg = result.message as any;
      mergeMessages([
        {
          id: msg.id,
          channel_id: conversationId,
          author_id: msg.author_id,
          content: msg.content,
          created_at: msg.created_at,
          edited_at: msg.edited_at ?? null,
          deleted_at: msg.deleted_at ?? null,
          author: {
            id: currentUserId,
            username: "you",
            display_name: "You",
            avatar_url: null,
          },
        },
      ]);
    }

    setText("");
    setLoading(false);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg) => {
          const mine = msg.author_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                }`}
              >
                {!mine && (
                  <p className="text-[11px] font-semibold opacity-70 mb-0.5">
                    {msg.author?.display_name || msg.author?.username || "User"}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    mine ? "opacity-70" : "text-muted-foreground"
                  }`}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border">
        {error && (
          <p className="text-xs text-destructive mb-2 px-1">{error}</p>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message…"
            className="flex-1 px-3 py-2.5 rounded-xl bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
