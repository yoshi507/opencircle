"use server";

import { createClient } from "@/lib/supabase/server";

export async function getMessages(channelId: string, limit = 50) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

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
    .maybeSingle();
  if (!membership) return [];

  // Try with parent_id filter (threads); fall back if column missing
  let rows: any[] | null = null;

  const withParent = await supabase
    .from("messages")
    .select(
      `id, channel_id, author_id, content, created_at, edited_at, deleted_at, parent_id,
       profiles:author_id (id, username, display_name, avatar_url)`
    )
    .eq("channel_id", channelId)
    .is("deleted_at", null)
    .is("parent_id", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (withParent.error && /parent_id/i.test(withParent.error.message)) {
    const fallback = await supabase
      .from("messages")
      .select(
        `id, channel_id, author_id, content, created_at, edited_at, deleted_at,
         profiles:author_id (id, username, display_name, avatar_url)`
      )
      .eq("channel_id", channelId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (fallback.error) {
      console.error(fallback.error);
      return [];
    }
    rows = fallback.data;
  } else if (withParent.error) {
    console.error(withParent.error);
    return [];
  } else {
    rows = withParent.data;
  }

  return (rows || []).map((m: any) => ({
    id: m.id,
    channel_id: m.channel_id,
    author_id: m.author_id,
    content: m.content,
    created_at: m.created_at,
    edited_at: m.edited_at,
    deleted_at: m.deleted_at,
    author: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
  }));
}

export async function sendMessage(channelId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 4000) {
    return { error: "Message must be 1–4000 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

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
    .maybeSingle();
  if (!membership) return { error: "Not a member." };

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      channel_id: channelId,
      author_id: user.id,
      content: trimmed,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Fire webhooks (non-blocking)
  void dispatchWebhooks(channel.server_id, "message.created", {
    channel_id: channelId,
    message_id: message.id,
    author_id: user.id,
    content: trimmed,
  });

  return { message };
}

async function dispatchWebhooks(
  serverId: string,
  event: string,
  payload: Record<string, unknown>
) {
  try {
    const supabase = await createClient();
    const { data: hooks } = await supabase
      .from("webhooks")
      .select("id, url, secret, events")
      .eq("server_id", serverId)
      .eq("enabled", true);

    if (!hooks?.length) return;

    for (const hook of hooks) {
      const events: string[] = Array.isArray(hook.events)
        ? hook.events
        : ["message.created"];
      if (!events.includes(event) && !events.includes("*")) continue;

      const body = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      });

      try {
        await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-OpenCircle-Event": event,
            ...(hook.secret
              ? { "X-OpenCircle-Secret": hook.secret }
              : {}),
          },
          body,
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        // ignore delivery failures
      }
    }
  } catch {
    // ignore
  }
}

export async function editMessage(messageId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 4000) {
    return { error: "Invalid content." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: msg } = await supabase
    .from("messages")
    .select("author_id")
    .eq("id", messageId)
    .single();

  if (!msg || msg.author_id !== user.id) {
    return { error: "You can only edit your own messages." };
  }

  const { error } = await supabase
    .from("messages")
    .update({ content: trimmed, edited_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteMessage(messageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: msg } = await supabase
    .from("messages")
    .select("author_id, channel_id")
    .eq("id", messageId)
    .single();

  if (!msg) return { error: "Message not found." };

  let allowed = msg.author_id === user.id;
  if (!allowed) {
    const { data: channel } = await supabase
      .from("channels")
      .select("server_id")
      .eq("id", msg.channel_id)
      .single();
    if (channel) {
      const { data: server } = await supabase
        .from("servers")
        .select("owner_id")
        .eq("id", channel.server_id)
        .single();
      if (server?.owner_id === user.id) allowed = true;
    }
  }

  if (!allowed) return { error: "Not allowed to delete this message." };

  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString(), content: null })
    .eq("id", messageId);

  if (error) return { error: error.message };
  return { ok: true };
}

export async function toggleReaction(messageId: string, emoji: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: existing } = await supabase
    .from("message_reactions")
    .select("*")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);
    return { removed: true };
  }

  const { error } = await supabase.from("message_reactions").insert({
    message_id: messageId,
    user_id: user.id,
    emoji,
  });

  if (error) return { error: error.message };
  return { added: true };
}
