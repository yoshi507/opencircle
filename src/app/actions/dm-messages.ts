"use server";

import { createClient } from "@/lib/supabase/server";

export async function getDMMessages(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: part } = await supabase
    .from("dm_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!part) return [];

  // Store DM messages in messages table with a synthetic approach:
  // We use a dedicated channel-less table pattern via content prefix OR
  // we create a special messages table for DMs. Simplest: use messages
  // with channel_id pointing to a hidden system approach won't work.
  // Instead use a dm_messages pattern via the messages table if we add
  // conversation_id column - but schema doesn't have it.
  //
  // Practical approach for now: store DMs in messages table using
  // a special "DM" server per user pair is too heavy.
  //
  // Use the attachments-free approach: store in a JSON via notifications
  // NO - let's add reading from a simple client-side compatible path:
  // We'll use the messages table with channel_id = conversationId and
  // rely on RLS that checks dm_participants. For that we need channels
  // to not require server. Alternative: create one "DM channel" per convo.

  // Ensure a channel row exists for this conversation (type text, server null won't work)
  // Schema requires server_id on channels. So create a private "DM" server is overkill.

  // Final approach: store DM text in notifications table is wrong.
  // We'll insert into messages only after creating a shadow channel.
  // For this completion pass, use a dedicated query against a view.

  // Use messages where we store conversation as channel after auto-creating
  // a system server "__dms__" owned by first user - too messy.

  // SIMPLEST working path: use the `messages` table and treat conversationId
  // as channel_id. RLS for messages checks channels -> server_members.
  // So we MUST have a channel. Auto-create on first message.

  return [];
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

  // Verify participant
  const { data: part } = await supabase
    .from("dm_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!part) return { error: "Not a participant." };

  // Get or create a dedicated DM channel under a personal "Direct Messages" server
  // owned by the current user for storage purposes.
  let { data: dmServer } = await supabase
    .from("servers")
    .select("id")
    .eq("owner_id", user.id)
    .eq("name", "__dm_storage__")
    .maybeSingle();

  if (!dmServer) {
    const { data: created } = await supabase
      .from("servers")
      .insert({
        name: "__dm_storage__",
        owner_id: user.id,
        visibility: "private",
        description: "System server for DM storage",
      })
      .select()
      .single();
    dmServer = created;
    if (created) {
      await supabase.from("server_members").insert({
        server_id: created.id,
        user_id: user.id,
        membership_status: "active",
      });
    }
  }

  if (!dmServer) return { error: "Could not init DM storage." };

  // Channel named after conversation
  let { data: channel } = await supabase
    .from("channels")
    .select("id")
    .eq("server_id", dmServer.id)
    .eq("name", conversationId)
    .maybeSingle();

  if (!channel) {
    const { data: createdCh } = await supabase
      .from("channels")
      .insert({
        server_id: dmServer.id,
        name: conversationId,
        type: "text",
        position: 0,
      })
      .select()
      .single();
    channel = createdCh;
  }

  if (!channel) return { error: "Could not create DM channel." };

  // Also add the other participant as member of dm storage so they can read
  const { data: others } = await supabase
    .from("dm_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", user.id);

  for (const o of others || []) {
    await supabase.from("server_members").upsert({
      server_id: dmServer.id,
      user_id: o.user_id,
      membership_status: "active",
    });
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      channel_id: channel.id,
      author_id: user.id,
      content: trimmed,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { message, channelId: channel.id };
}

export async function getDMChannelMessages(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { messages: [], channelId: null };

  const { data: part } = await supabase
    .from("dm_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!part) return { messages: [], channelId: null };

  // Find any channel named after this conversation across DM storage servers
  const { data: channels } = await supabase
    .from("channels")
    .select("id, server_id")
    .eq("name", conversationId);

  if (!channels?.length) return { messages: [], channelId: null };

  const channelId = channels[0].id;

  const { data } = await supabase
    .from("messages")
    .select(
      `id, channel_id, author_id, content, created_at, edited_at, deleted_at,
       profiles:author_id (id, username, display_name, avatar_url)`
    )
    .eq("channel_id", channelId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  const messages = (data || []).map((m: any) => ({
    id: m.id,
    channel_id: m.channel_id,
    author_id: m.author_id,
    content: m.content,
    created_at: m.created_at,
    edited_at: m.edited_at,
    deleted_at: m.deleted_at,
    author: m.profiles,
  }));

  return { messages, channelId };
}
