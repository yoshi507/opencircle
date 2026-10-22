"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinPublicServer } from "@/app/actions/discovery";
import { Compass, Loader2 } from "lucide-react";

type Server = {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
};

export function DiscoverClient({
  servers,
  joinedIds,
}: {
  servers: Server[];
  joinedIds: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<Set<string>>(new Set(joinedIds));

  async function handleJoin(id: string) {
    setBusy(id);
    setError(null);
    const result = await joinPublicServer(id);
    if (result.error) {
      setError(result.error);
      setBusy(null);
      return;
    }
    setJoined((prev) => new Set(prev).add(id));
    setBusy(null);
    router.push(`/app/servers/${id}`);
    router.refresh();
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold">Public communities</h2>
            <p className="text-sm text-muted-foreground">
              Browse and join servers that owners have made public.
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {servers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No public servers yet. Make yours public in Server settings.
          </p>
        ) : (
          <div className="space-y-2">
            {servers.map((s) => {
              const isJoined = joined.has(s.id);
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center text-lg font-bold shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{s.name}</p>
                    {s.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {s.description}
                      </p>
                    )}
                  </div>
                  {isJoined ? (
                    <button
                      onClick={() => router.push(`/app/servers/${s.id}`)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent"
                    >
                      Open
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoin(s.id)}
                      disabled={busy === s.id}
                      className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center gap-1"
                    >
                      {busy === s.id && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      Join
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
