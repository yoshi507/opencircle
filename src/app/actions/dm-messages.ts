"use server";

import { createClient } from "@/lib/supabase/server";

export async function getDMChannelMessages(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { messages: [], channelId: null };

  const { data: isMember } = await supabase.rpc("is_dm_member", {
    conv_id: conversationId,
  });

  if (!isMember) {
    const { data: part } = await supabase
      .from("dm_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!part) return { messages: [], channelId: null };
  }

  const { data, error } = await supabase
    .from("dm_messages")
    .select(
      `id, conversation_id, author_id, content, created_at, edited_at, deleted_at,
       profiles:author_id (id, username, display_name, avatar_url)`
    )
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("getDMChannelMessages", error.message);
    return { messages: [], channelId: null, error: error.message };
  }

  const messages = (data || []).map((m: any) => ({
    id: m.id,
    channel_id: conversationId,
    author_id: m.author_id,
    content: m.content,
    created_at: m.created_at,
    edited_at: m.edited_at,
    deleted_at: m.deleted_at,
    author: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
  }));

  return { messages, channelId: conversationId };
}

export async function sendDMMessage(conversationId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 4000) {
    return { error: "Invalid message." };
  }

  const { data: isMember } = await supabase.rpc("is_dm_member", {
    conv_id: conversationId,
  });
  if (!isMember) {
    const { data: part } = await supabase
      .from("dm_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!part) return { error: "Not a participant." };
  }

  const { data: message, error } = await supabase
    .from("dm_messages")
    .insert({
      conversation_id: conversationId,
      author_id: user.id,
      content: trimmed,
    })
    .select(
      `id, conversation_id, author_id, content, created_at, edited_at, deleted_at`
    )
    .single();

  if (error) {
    if (/relation|does not exist|dm_messages/i.test(error.message)) {
      return {
        error:
          "Run 014_dm_messages_realtime.sql in Supabase SQL Editor (creates shared dm_messages table).",
      };
    }
    return { error: error.message };
  }

  return { message, channelId: conversationId };
}

/** Poll for new messages (fallback when Realtime is off). */
export async function pollDMMessages(
  conversationId: string,
  afterIso?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let q = supabase
    .from("dm_messages")
    .select(
      `id, conversation_id, author_id, content, created_at, edited_at, deleted_at,
       profiles:author_id (id, username, display_name, avatar_url)`
    )
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (afterIso) {
    q = q.gt("created_at", afterIso);
  }

  const { data } = await q;
  return (data || []).map((m: any) => ({
    id: m.id,
    channel_id: conversationId,
    author_id: m.author_id,
    content: m.content,
    created_at: m.created_at,
    edited_at: m.edited_at,
    deleted_at: m.deleted_at,
    author: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
  }));
}

export async function getDMMessages(conversationId: string) {
  const { messages } = await getDMChannelMessages(conversationId);
  return messages;
}
