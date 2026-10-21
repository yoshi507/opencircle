"use client";

import { useState, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { sendMessage } from "@/app/actions/messages";

export function MessageComposer({ channelId }: { channelId: string }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || loading) return;

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
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message #channel"
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
