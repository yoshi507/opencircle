"use server";

import { createClient } from "@/lib/supabase/server";

export async function searchMessages(query: string, serverId?: string) {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get servers the user is in
  const { data: memberships } = await supabase
    .from("server_members")
    .select("server_id")
    .eq("user_id", user.id)
    .eq("membership_status", "active");

  const serverIds = (memberships || []).map((m) => m.server_id);
  if (!serverIds.length) return [];

  const filterServers = serverId ? [serverId] : serverIds;

  // Channels in those servers
  const { data: channels } = await supabase
    .from("channels")
    .select("id, name, server_id")
    .in("server_id", filterServers);

  if (!channels?.length) return [];
  const channelIds = channels.map((c) => c.id);
  const channelMap = Object.fromEntries(
    channels.map((c) => [c.id, c])
  );

  const { data: messages } = await supabase
    .from("messages")
    .select(
      `id, content, created_at, channel_id, author_id,
       profiles:author_id (username, display_name)`
    )
    .in("channel_id", channelIds)
    .is("deleted_at", null)
    .is("parent_id", null)
    .ilike("content", `%${q.replace(/%/g, "\\%")}%`)
    .order("created_at", { ascending: false })
    .limit(30);

  return (messages || []).map((m: any) => ({
    id: m.id,
    content: m.content,
    created_at: m.created_at,
    channel_id: m.channel_id,
    channel_name: channelMap[m.channel_id]?.name || "channel",
    server_id: channelMap[m.channel_id]?.server_id,
    author: m.profiles,
  }));
}
