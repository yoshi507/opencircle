"use server";

import { createClient } from "@/lib/supabase/server";

export async function getMessages(channelId: string, limit = 50) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get channel → server and verify membership
  const { data: channel } = await supabase
    .from("channels")
    .select("server_id")
    .eq("id", channelId)
    .single();

  if (!channel) return [];

  const { data: membership } = await supabase
    .from("server_members")
    .select("user_id")
    .eq("server_id", channel.server_id)
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .single();

  if (!membership) return [];

  const { data, error } = await supabase
    .from("messages")
    .select(
      `
      id,
      channel_id,
      author_id,
      content,
      created_at,
      edited_at,
      deleted_at,
      profiles:author_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq("channel_id", channelId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error(error);
    return [];
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    channel_id: m.channel_id,
    author_id: m.author_id,
    content: m.content,
    created_at: m.created_at,
    edited_at: m.edited_at,
    deleted_at: m.deleted_at,
    author: m.profiles,
  }));
}

export async function sendMessage(channelId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 4000) {
    return { error: "Message must be between 1 and 4000 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." };

  // Verify membership via channel → server
  const { data: channel } = await supabase
    .from("channels")
    .select("server_id")
    .eq("id", channelId)
    .single();

  if (!channel) return { error: "Channel not found." };

  const { data: membership } = await supabase
    .from("server_members")
    .select("user_id")
    .eq("server_id", channel.server_id)
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .single();

  if (!membership) return { error: "You are not a member of this server." };

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      channel_id: channelId,
      author_id: user.id,
      content: trimmed,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { message };
}
