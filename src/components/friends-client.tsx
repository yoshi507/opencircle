"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateDM, blockUser, unblockUser } from "@/app/actions/dms";
import { MessageCircle, Ban, Loader2 } from "lucide-react";

export function FriendsClient({
  initialDMs,
  initialBlocks,
  currentUserId,
}: {
  initialDMs: any[];
  initialBlocks: any[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dms] = useState(initialDMs);
  const [blocks, setBlocks] = useState(initialBlocks);

  async function startDM(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Look up user by username via a simple approach - client side fetch to profiles
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username.toLowerCase().trim())
      .maybeSingle();

    if (!profile) {
      setError("User not found.");
      setLoading(false);
      return;
    }

    const result = await getOrCreateDM(profile.id);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/app/dms/${result.conversationId}`);
    setLoading(false);
  }

  async function handleUnblock(id: string) {
    await unblockUser(id);
    setBlocks((prev) => prev.filter((b) => b.blocked_id !== id));
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg space-y-8">
        <form onSubmit={startDM} className="space-y-3">
          <h2 className="font-semibold">Start a DM</h2>
          <div className="flex gap-2">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="flex-1 px-3 py-2 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Message
            </button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        <div>
          <h2 className="font-semibold mb-3">Direct messages</h2>
          {dms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            <div className="space-y-1">
              {dms.map((dm) => (
                <button
                  key={dm.conversationId}
                  onClick={() => router.push(`/app/dms/${dm.conversationId}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold">
                    {(dm.other?.display_name || dm.other?.username || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {dm.other?.display_name || dm.other?.username || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">@{dm.other?.username}</p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-muted-foreground ml-auto" />
                </button>
              ))}
            </div>
          )}
        </div>

        {blocks.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Ban className="w-4 h-4" /> Blocked users
            </h2>
            <div className="space-y-1">
              {blocks.map((b) => (
                <div
                  key={b.blocked_id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border"
                >
                  <span className="text-sm">
                    {b.profiles?.display_name || b.profiles?.username || b.blocked_id}
                  </span>
                  <button
                    onClick={() => handleUnblock(b.blocked_id)}
                    className="text-xs text-primary hover:underline"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
