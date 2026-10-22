"use client";

import { useState } from "react";
import { createRole } from "@/app/actions/roles";
import { createClient } from "@/lib/supabase/client";
import { InviteButton } from "@/components/invite-button";
import { CreateChannelButton } from "@/components/create-channel-button";
import { CreateVoiceChannelButton } from "@/components/create-voice-channel-button";
import { Loader2 } from "lucide-react";

export function ServerSettingsClient({
  server,
  roles: initialRoles,
  auditLogs,
  serverId,
}: {
  server: any;
  roles: any[];
  auditLogs: any[];
  serverId: string;
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [roleName, setRoleName] = useState("");
  const [rules, setRules] = useState(server.description || "");
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
