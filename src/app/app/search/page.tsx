"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { searchMessages } from "@/app/actions/search";
import { Search, Loader2 } from "lucide-react";

export default function SearchPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    const data = await searchMessages(q);
    setResults(data);
    setLoading(false);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="h-12 px-4 flex items-center border-b border-border bg-card/30 shrink-0">
        <h1 className="font-semibold">Search</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto space-y-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search messages…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={loading || q.trim().length < 2}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Search
            </button>
          </form>

          {searched && results.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages found.
            </p>
          )}

          <div className="space-y-2">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  if (r.server_id && r.channel_id) {
                    router.push(
                      `/app/servers/${r.server_id}/channels/${r.channel_id}`
                    );
                  }
                }}
                className="w-full text-left p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
              >
                <div className="flex items-baseline gap-2 text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-foreground">
                    #{r.channel_name}
                  </span>
                  <span>
                    {r.author?.display_name || r.author?.username || "Unknown"}
                  </span>
                  <span>
                    {new Date(r.created_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm line-clamp-2">{r.content}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
