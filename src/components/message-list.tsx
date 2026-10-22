"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  editMessage,
  deleteMessage,
  toggleReaction,
} from "@/app/actions/messages";
import { getThreadReplies, sendThreadReply } from "@/app/actions/threads";
import { summarizeChannel } from "@/app/actions/summarize";
import type { Message, Profile } from "@/lib/types";
import {
  Pencil,
  Trash2,
  MessageSquare,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";

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
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadReplies, setThreadReplies] = useState<any[]>([]);
  const [threadText, setThreadText] = useState("");
  const [threadLoading, setThreadLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
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
          // Skip thread replies in main list
          if (newMsg.parent_id) return;

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

  async function openThread(id: string) {
    setThreadId(id);
    setThreadLoading(true);
    const replies = await getThreadReplies(id);
    setThreadReplies(replies);
    setThreadLoading(false);
  }

  async function handleThreadSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!threadId || !threadText.trim()) return;
    const result = await sendThreadReply(threadId, threadText);
    if (!result.error) {
      setThreadText("");
      const replies = await getThreadReplies(threadId);
      setThreadReplies(replies);
    }
  }

  async function handleSummarize() {
    setSummarizing(true);
    setSummary(null);
    const result = await summarizeChannel(channelId);
    setSummary(result.summary || result.error || "Could not summarize.");
    setSummarizing(false);
  }

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

  const parentMsg = messages.find((m) => m.id === threadId);

  return (
    <div className="flex-1 flex min-h-0 relative">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 pt-2 flex justify-end">
          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-accent"
          >
            {summarizing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Summarize
          </button>
        </div>

        {summary && (
          <div className="mx-4 mb-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm whitespace-pre-wrap relative">
            <button
              onClick={() => setSummary(null)}
              className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <p className="font-medium text-xs text-primary mb-1">AI summary</p>
            {summary}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-sm">
                No messages yet. Say hello! 👋
              </p>
            </div>
          )}
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
                      {msg.author?.display_name ||
                        msg.author?.username ||
                        "Unknown"}
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
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  )}

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
                    <button
                      onClick={() => openThread(msg.id)}
                      className="p-1 hover:bg-accent rounded text-muted-foreground"
                      title="Reply in thread"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
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
      </div>

      {/* Thread panel */}
      {threadId && (
        <div className="w-full sm:w-80 shrink-0 border-l border-border bg-card flex flex-col absolute sm:relative inset-0 sm:inset-auto z-20">
          <div className="h-12 px-3 flex items-center justify-between border-b border-border">
            <span className="font-semibold text-sm">Thread</span>
            <button
              onClick={() => setThreadId(null)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {parentMsg && (
              <div className="pb-3 border-b border-border">
                <p className="text-xs font-semibold mb-1">
                  {parentMsg.author?.display_name ||
                    parentMsg.author?.username}
                </p>
                <p className="text-sm">{parentMsg.content}</p>
              </div>
            )}
            {threadLoading && (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            )}
            {threadReplies.map((r) => (
              <div key={r.id} className="text-sm">
                <span className="font-semibold text-xs">
                  {r.author?.display_name || r.author?.username || "Unknown"}
                </span>
                <p className="whitespace-pre-wrap">{r.content}</p>
              </div>
            ))}
          </div>
          <form
            onSubmit={handleThreadSend}
            className="p-2 border-t border-border flex gap-2"
          >
            <input
              value={threadText}
              onChange={(e) => setThreadText(e.target.value)}
              placeholder="Reply…"
              className="flex-1 px-2 py-1.5 rounded-lg bg-background border border-input text-sm"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
