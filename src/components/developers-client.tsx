"use client";

import { useState } from "react";
import {
  createApp,
  updateApp,
  deleteApp,
  regenerateBotToken,
} from "@/app/actions/bots";
import {
  Code2,
  Copy,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";

const ALL_SCOPES = [
  "bot",
  "messages.read",
  "messages.write",
  "servers.read",
  "moderation",
];

export function DevelopersClient({ initialApps }: { initialApps: any[] }) {
  const [apps, setApps] = useState(initialApps);
  const [selected, setSelected] = useState<any | null>(initialApps[0] || null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scopes, setScopes] = useState<string[]>(["bot", "messages.read", "messages.write"]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showToken, setShowToken] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const result = await createApp({ name, description, scopes });
    if (result.error) {
      setMsg(result.error);
    } else if (result.app) {
      setApps((prev) => [result.app, ...prev]);
      setSelected(result.app);
      setCreating(false);
      setName("");
      setDescription("");
      setMsg("App created — copy your bot token now.");
      setShowToken(true);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!selected) return;
    setLoading(true);
    const result = await updateApp(selected.id, {
      name: selected.name,
      description: selected.description,
      icon_url: selected.icon_url,
      scopes: selected.scopes,
    });
    if (result.error) setMsg(result.error);
    else {
      setMsg("Saved");
      setApps((prev) =>
        prev.map((a) => (a.id === selected.id ? { ...a, ...result.app } : a))
      );
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!selected || !confirm("Delete this application?")) return;
    setLoading(true);
    await deleteApp(selected.id);
    setApps((prev) => prev.filter((a) => a.id !== selected.id));
    setSelected(null);
    setLoading(false);
  }

  async function handleRegen() {
    if (!selected) return;
    setLoading(true);
    const result = await regenerateBotToken(selected.id);
    if (result.bot_token) {
      setSelected({ ...selected, bot_token: result.bot_token });
      setShowToken(true);
      setMsg("New bot token generated");
    } else setMsg(result.error || "Failed");
    setLoading(false);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setMsg("Copied");
  }

  function toggleScope(s: string) {
    if (!selected) return;
    const cur: string[] = selected.scopes || [];
    const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
    setSelected({ ...selected, scopes: next });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="h-12 px-4 flex items-center gap-2 border-b border-border bg-card/30 shrink-0">
        <Code2 className="w-5 h-5 text-muted-foreground" />
        <h1 className="font-semibold">Developer Portal</h1>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* App list */}
        <aside className="w-56 shrink-0 border-r border-border overflow-y-auto p-3 space-y-2">
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New application
          </button>
          {apps.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setSelected(a);
                setCreating(false);
                setShowToken(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate ${
                selected?.id === a.id
                  ? "bg-accent font-medium"
                  : "hover:bg-accent/50 text-muted-foreground"
              }`}
            >
              {a.name}
            </button>
          ))}
          {apps.length === 0 && !creating && (
            <p className="text-xs text-muted-foreground px-1">No apps yet.</p>
          )}
        </aside>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg space-y-6">
            {msg && <p className="text-sm text-green-500">{msg}</p>}

            {creating && (
              <form onSubmit={handleCreate} className="space-y-4">
                <h2 className="text-lg font-bold">Create application</h2>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="App name"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  {ALL_SCOPES.map((s) => (
                    <label key={s} className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={scopes.includes(s)}
                        onChange={() =>
                          setScopes((prev) =>
                            prev.includes(s)
                              ? prev.filter((x) => x !== s)
                              : [...prev, s]
                          )
                        }
                      />
                      {s}
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </form>
            )}

            {!creating && selected && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold">Edit application</h2>
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <input
                    value={selected.name || ""}
                    onChange={(e) =>
                      setSelected({ ...selected, name: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-input text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    value={selected.description || ""}
                    onChange={(e) =>
                      setSelected({ ...selected, description: e.target.value })
                    }
                    rows={3}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-input text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Icon URL (pfp)
                  </label>
                  <input
                    value={selected.icon_url || ""}
                    onChange={(e) =>
                      setSelected({ ...selected, icon_url: e.target.value })
                    }
                    placeholder="https://…"
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-input text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Scopes</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {ALL_SCOPES.map((s) => (
                      <label key={s} className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={(selected.scopes || []).includes(s)}
                          onChange={() => toggleScope(s)}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                  <p className="text-xs text-muted-foreground">Client ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs flex-1 truncate">
                      {selected.client_id}
                    </code>
                    <button
                      type="button"
                      onClick={() => copy(selected.client_id)}
                      className="p-1.5 rounded hover:bg-accent"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2">Bot token</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs flex-1 truncate">
                      {showToken
                        ? selected.bot_token
                        : "••••••••••••••••••••••••"}
                    </code>
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="text-xs text-primary"
                    >
                      {showToken ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => copy(selected.bot_token)}
                      className="p-1.5 rounded hover:bg-accent"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRegen}
                      className="p-1.5 rounded hover:bg-accent"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                  >
                    Save changes
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 border border-destructive text-destructive rounded-lg text-sm flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            )}

            {!creating && !selected && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                <Code2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Create an application to get a bot token and client ID.</p>
                <p className="mt-2 text-xs">
                  Built-in bot: type <code className="text-foreground">!help</code>{" "}
                  in any channel.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
