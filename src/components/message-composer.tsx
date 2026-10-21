"use client";

import { useState, useRef } from "react";
import { sendMessage } from "@/app/actions/messages";
import { uploadAttachment } from "@/app/actions/attachments";
import { Send, Loader2, Paperclip } from "lucide-react";

// Simple client-side rate limit: max 5 messages per 10 seconds
const recentSends: number[] = [];

export function MessageComposer({ channelId }: { channelId: string }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function checkRateLimit() {
    const now = Date.now();
    while (recentSends.length && now - recentSends[0] > 10000) {
      recentSends.shift();
    }
    if (recentSends.length >= 5) {
      return false;
    }
    recentSends.push(now);
    return true;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || loading) return;

    if (!checkRateLimit()) {
      setError("Slow down — max 5 messages per 10 seconds.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await sendMessage(channelId, trimmed);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setContent("");
    setLoading(false);
    inputRef.current?.focus();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadAttachment(channelId, fd);
    if (result.error) setError(result.error);
    setLoading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="p-3 border-t border-border bg-card/50">
      {error && (
        <div className="text-xs text-destructive mb-2 px-1">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.txt"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          rows={1}
          className="flex-1 px-3 py-2.5 rounded-xl bg-background border border-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring max-h-32"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
}
