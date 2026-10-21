"use client";

import { useState } from "react";
import { kickMember, banMember } from "@/app/actions/moderation";
import { Users, MoreVertical } from "lucide-react";

type Member = {
  user_id: string;
  nickname: string | null;
  joined_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

export function MembersPanel({
  serverId,
  members,
  isOwner,
  currentUserId,
}: {
  serverId: string;
  members: Member[];
  isOwner: boolean;
  currentUserId: string;
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleKick(userId: string) {
    if (!confirm("Kick this member?")) return;
    setBusy(true);
    await kickMember(serverId, userId);
    setBusy(false);
    setOpenMenu(null);
    window.location.reload();
  }

  async function handleBan(userId: string) {
    if (!confirm("Ban this member? They will not be able to rejoin with the same account.")) return;
    setBusy(true);
    await banMember(serverId, userId);
    setBusy(false);
    setOpenMenu(null);
    window.location.reload();
  }

  return (
    <div className="w-56 shrink-0 border-l border-border bg-card/50 hidden lg:flex flex-col">
      <div className="h-12 px-3 flex items-center gap-2 border-b border-border text-sm font-semibold text-muted-foreground">
        <Users className="w-4 h-4" />
        Members — {members.length}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {members.map((m) => {
          const name =
            m.nickname ||
            m.profiles?.display_name ||
            m.profiles?.username ||
            "Unknown";
          const isSelf = m.user_id === currentUserId;
          return (
            <div
              key={m.user_id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 group relative"
            >
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm truncate flex-1">{name}</span>
              {isOwner && !isSelf && (
                <div className="relative">
                  <button
                    onClick={() =>
                      setOpenMenu(openMenu === m.user_id ? null : m.user_id)
                    }
                    className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                    disabled={busy}
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                  {openMenu === m.user_id && (
                    <div className="absolute right-0 top-6 z-10 w-28 bg-card border border-border rounded-lg shadow-lg py-1 text-sm">
                      <button
                        onClick={() => handleKick(m.user_id)}
                        className="w-full text-left px-3 py-1.5 hover:bg-accent"
                      >
                        Kick
                      </button>
                      <button
                        onClick={() => handleBan(m.user_id)}
                        className="w-full text-left px-3 py-1.5 hover:bg-accent text-destructive"
                      >
                        Ban
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
