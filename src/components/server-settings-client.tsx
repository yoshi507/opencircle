"use client";

import { useState } from "react";
import { createRole } from "@/app/actions/roles";
import { setServerVisibility } from "@/app/actions/discovery";
import { createWebhook, deleteWebhook } from "@/app/actions/webhooks";
import { createClient } from "@/lib/supabase/client";
import { InviteButton } from "@/components/invite-button";
import { CreateChannelButton } from "@/components/create-channel-button";
import { CreateVoiceChannelButton } from "@/components/create-voice-channel-button";
import { Loader2, Trash2 } from "lucide-react";

export function ServerSettingsClient({
  server,
  roles: initialRoles,
  auditLogs,
  webhooks: initialWebhooks = [],
  serverId,
}: {
  server: any;
  roles: any[];
  auditLogs: any[];
  webhooks?: any[];
  serverId: string;
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [roleName, setRoleName] = useState("");
  const [rules, setRules] = useState(server.description || "");
  const [visibility, setVisibility] = useState(
    server.visibility === "public" ? "public" : "private"
  );
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [hookUrl, setHookUrl] = useState("");
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await createRole(serverId, roleName);
    if (result.role) {
      setRoles((prev) => [...prev, result.role]);
      setRoleName("");
      setMsg("Role created");
    } else {
      setMsg(result.error || "Failed");
    }
    setLoading(false);
  }

  async function handleSaveRules(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("servers")
      .update({ description: rules.trim() || null })
      .eq("id", serverId);
    setMsg("Rules saved");
    setLoading(false);
  }

  async function handleVisibility(next: "public" | "private") {
    setLoading(true);
    const result = await setServerVisibility(serverId, next);
    if (result.error) {
      setMsg(result.error);
    } else {
      setVisibility(next);
      setMsg(next === "public" ? "Server is now public" : "Server is now private");
    }
    setLoading(false);
  }

  async function handleCreateWebhook(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNewSecret(null);
    const result = await createWebhook(serverId, hookUrl);
    if (result.error) {
      setMsg(result.error);
    } else if (result.webhook) {
      setWebhooks((prev) => [result.webhook, ...prev]);
      setHookUrl("");
      setNewSecret(result.webhook.secret || null);
      setMsg("Webhook created");
    }
    setLoading(false);
  }

  async function handleDeleteWebhook(id: string) {
    if (!confirm("Delete this webhook?")) return;
    setLoading(true);
    await deleteWebhook(serverId, id);
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    setLoading(false);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-xl space-y-10">
        <h1 className="text-2xl font-bold">Server settings</h1>
        <p className="text-muted-foreground -mt-6">{server.name}</p>

        <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
          <h2 className="font-semibold">Quick actions</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <CreateChannelButton serverId={serverId} />
            <CreateVoiceChannelButton serverId={serverId} />
            <InviteButton serverId={serverId} />
          </div>
        </div>

        <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
          <h2 className="font-semibold">Visibility</h2>
          <p className="text-sm text-muted-foreground">
            Public servers appear on the Discover page so anyone can join.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || visibility === "private"}
              onClick={() => handleVisibility("private")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                visibility === "private"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border hover:bg-accent"
              }`}
            >
              Private
            </button>
            <button
              type="button"
              disabled={loading || visibility === "public"}
              onClick={() => handleVisibility("public")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                visibility === "public"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border hover:bg-accent"
              }`}
            >
              Public
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveRules} className="space-y-3">
          <h2 className="font-semibold">Rules / description</h2>
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm"
            placeholder="Server rules and welcome text…"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
          >
            Save
          </button>
        </form>

        <div className="space-y-3">
          <h2 className="font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Receive POST requests when events happen (e.g. new messages).
          </p>
          {webhooks.length > 0 && (
            <ul className="space-y-1 text-sm">
              {webhooks.map((w) => (
                <li
                  key={w.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border"
                >
                  <span className="truncate flex-1 font-mono text-xs">{w.url}</span>
                  <button
                    onClick={() => handleDeleteWebhook(w.id)}
                    className="p-1 text-destructive hover:bg-accent rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {newSecret && (
            <p className="text-xs text-amber-400 break-all">
              Secret (copy now): {newSecret}
            </p>
          )}
          <form onSubmit={handleCreateWebhook} className="flex gap-2">
            <input
              value={hookUrl}
              onChange={(e) => setHookUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              required
              className="flex-1 px-3 py-2 rounded-lg bg-background border border-input text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-secondary rounded-lg text-sm font-medium"
            >
              Add
            </button>
          </form>
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold">Roles</h2>
          <ul className="space-y-1 text-sm">
            {roles.map((r) => (
              <li
                key={r.id}
                className="px-3 py-2 rounded-lg bg-card border border-border"
              >
                {r.name}
              </li>
            ))}
            {roles.length === 0 && (
              <p className="text-muted-foreground text-sm">No custom roles yet.</p>
            )}
          </ul>
          <form onSubmit={handleCreateRole} className="flex gap-2">
            <input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="Role name"
              required
              className="flex-1 px-3 py-2 rounded-lg bg-background border border-input text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-secondary rounded-lg text-sm font-medium flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Add role
            </button>
          </form>
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold">Audit log</h2>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No actions yet.</p>
          ) : (
            <ul className="space-y-1 text-sm max-h-64 overflow-y-auto">
              {auditLogs.map((log) => (
                <li
                  key={log.id}
                  className="px-3 py-2 rounded-lg bg-card border border-border flex justify-between gap-2"
                >
                  <span>
                    <strong>{log.action}</strong> → {log.target_id?.slice(0, 8)}…
                    {log.metadata?.reason && (
                      <span className="text-muted-foreground">
                        {" "}— {log.metadata.reason}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {msg && <p className="text-sm text-green-500">{msg}</p>}
      </div>
    </div>
  );
}
