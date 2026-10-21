"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { editMessage, deleteMessage, toggleReaction } from "@/app/actions/messages";
import type { Message, Profile } from "@/lib/types";
import { Pencil, Trash2, Smile } from "lucide-react";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉"];

export function MessageList({
  channelId,
  initialMessages,
  currentUserId,
}: {
  channelId: string;
  initialMessages: Message[];
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
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
          const newMsg = payload.new as any;
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
                author,
              },
            ];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setMessages((prev) =>
            prev
              .map((m) =>
                m.id === updated.id
                  ? {
                      ...m,
                      content: updated.content,
                      edited_at: updated.edited_at,
                      deleted_at: updated.deleted_at,
                    }
                  : m
              )
              .filter((m) => !m.deleted_at)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  async function handleEdit(id: string) {
    const result = await editMessage(id, editText);
    if (!result.error) {
      setEditingId(null);
      setEditText("");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this message?")) return;
    await deleteMessage(id);
  }

  async function handleReaction(id: string, emoji: string) {
    await toggleReaction(id, emoji);
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">No messages yet. Say hello! 👋</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg) => {
        const isOwn = msg.author_id === currentUserId;
        return (
          <div key={msg.id} className="flex gap-3 group relative">
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
                  {msg.edited_at && " (edited)"}
                </span>
              </div>

              {editingId === msg.id ? (
                <div className="mt-1 flex gap-2">
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1 px-2 py-1 rounded bg-background border border-input text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEdit(msg.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <button
                    onClick={() => handleEdit(msg.id)}
                    className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
              )}

              {/* Hover actions */}
              <div className="absolute right-0 top-0 hidden group-hover:flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-sm p-0.5">
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => handleReaction(msg.id, e)}
                    className="p-1 hover:bg-accent rounded text-sm"
                  >
                    {e}
                  </button>
                ))}
                {isOwn && (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(msg.id);
                        setEditText(msg.content || "");
                      }}
                      className="p-1 hover:bg-accent rounded text-muted-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(msg.id)}
                      className="p-1 hover:bg-accent rounded text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
