"use server";

import { createClient } from "@/lib/supabase/server";

export async function getThreadReplies(parentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("messages")
    .select(
      `id, channel_id, author_id, content, created_at, edited_at, parent_id,
       profiles:author_id (id, username, display_name, avatar_url)`
    )
    .eq("parent_id", parentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

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
    parent_id: m.parent_id,
    author: m.profiles,
  }));
}

export async function sendThreadReply(parentId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 4000) {
    return { error: "Invalid message." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: parent } = await supabase
    .from("messages")
    .select("id, channel_id")
    .eq("id", parentId)
    .single();

  if (!parent) return { error: "Parent message not found." };

  const { data: channel } = await supabase
    .from("channels")
    .select("server_id")
    .eq("id", parent.channel_id)
    .single();
  if (!channel) return { error: "Channel not found." };

  const { data: membership } = await supabase
    .from("server_members")
    .select("user_id")
    .eq("server_id", channel.server_id)
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .maybeSingle();
  if (!membership) return { error: "Not a member." };

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      channel_id: parent.channel_id,
      author_id: user.id,
      content: trimmed,
      parent_id: parentId,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { message };
}
