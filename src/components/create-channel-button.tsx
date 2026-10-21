"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createChannel } from "@/app/actions/channels";
import { Plus, Loader2, X } from "lucide-react";

export function CreateChannelButton({ serverId }: { serverId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createChannel(serverId, name);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setOpen(false);
    setName("");
    setLoading(false);
    if (result.channel) {
      router.push(`/app/servers/${serverId}/channels/${result.channel.id}`);
      router.refresh();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Channel
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => !loading && setOpen(false)} />
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Create channel</h2>
              <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="channel-name"
                required
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
