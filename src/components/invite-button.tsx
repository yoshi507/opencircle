"use client";

import { useState } from "react";
import { createInvite } from "@/app/actions/invites";
import { Link2, Loader2, Check, Copy } from "lucide-react";

export function InviteButton({ serverId }: { serverId: string }) {
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    setInviteUrl(null);

    const result = await createInvite(serverId, 10, 24 * 7); // 10 uses, 7 days

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const fullUrl = `${window.location.origin}${result.url}`;
    setInviteUrl(fullUrl);
    setLoading(false);
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      {!inviteUrl ? (
        <button
          onClick={handleCreate}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          Create invite
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={inviteUrl}
            className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-background border border-input truncate"
          />
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-primary text-primary-foreground"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
