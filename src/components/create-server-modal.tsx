"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { createServer } from "@/app/actions/servers";

export function CreateServerModal({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createServer(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);

    if (result.server && result.channelId) {
      router.push(
        `/app/servers/${result.server.id}/channels/${result.channelId}`
      );
      router.refresh();
    } else if (result.server) {
      router.push(`/app/servers/${result.server.id}`);
      router.refresh();
    }
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create a server</h2>
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Server name
                </label>
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="My awesome community"
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  name="description"
                  rows={2}
                  maxLength={300}
                  placeholder="What is this community about?"
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create server"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
