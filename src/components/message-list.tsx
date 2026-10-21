"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message, Profile } from "@/lib/types";

export function MessageList({
  channelId,
  initialMessages,
}: {
  channelId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, channelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const newMsg = payload.new as {
            id: string;
            channel_id: string;
            author_id: string;
            content: string | null;
            created_at: string;
            edited_at: string | null;
            deleted_at: string | null;
          };

          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .eq("id", newMsg.author_id)
            .single();

          const author: Profile | undefined = profile
            ? {
                id: profile.id,
                username: profile.username,
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
              }
            : undefined;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const next: Message = {
              id: newMsg.id,
              channel_id: newMsg.channel_id,
              author_id: newMsg.author_id,
              content: newMsg.content,
              created_at: newMsg.created_at,
              edited_at: newMsg.edited_at,
              deleted_at: newMsg.deleted_at,
              author,
            };
            return [...prev, next];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">
          No messages yet. Say hello! 👋
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => (
        <div key={msg.id} className="flex gap-3 group">
          <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
            {(msg.author?.display_name || msg.author?.username || "?")
              .charAt(0)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm">
                {msg.author?.display_name || msg.author?.username || "Unknown"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {new Date(msg.created_at).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap break-words">
              {msg.content}
            </p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
