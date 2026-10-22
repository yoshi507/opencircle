"use server";

import { createClient } from "@/lib/supabase/server";

export async function getVoiceToken(channelId: string) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    return {
      error:
        "Voice is not configured. Add LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and NEXT_PUBLIC_LIVEKIT_URL in Vercel.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: channel } = await supabase
    .from("channels")
    .select("id, server_id, type, name")
    .eq("id", channelId)
    .single();

  if (!channel) return { error: "Channel not found." };
  if (channel.type !== "voice") {
    return { error: "This is not a voice channel." };
  }

  const { data: membership } = await supabase
    .from("server_members")
    .select("user_id")
    .eq("server_id", channel.server_id)
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .maybeSingle();

  if (!membership) return { error: "Not a member of this server." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  const identity = user.id;
  const name =
    profile?.display_name || profile?.username || user.email || "User";

  // Dynamic import so the module is only loaded when needed
  const { AccessToken } = await import("livekit-server-sdk");

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    ttl: "2h",
  });

  at.addGrant({
    roomJoin: true,
    room: channelId,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return {
    token,
    url: livekitUrl,
    roomName: channelId,
    identity,
    displayName: name,
  };
}

export async function createVoiceChannel(serverId: string, name: string) {
  const cleaned = name.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 100);
  if (!cleaned) return { error: "Channel name required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: server } = await supabase
    .from("servers")
    .select("owner_id")
    .eq("id", serverId)
    .single();

  if (!server || server.owner_id !== user.id) {
    return { error: "Only the server owner can create channels." };
  }

  const { data: channel, error } = await supabase
    .from("channels")
    .insert({
      server_id: serverId,
      name: cleaned,
      type: "voice",
      position: 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { channel };
}
