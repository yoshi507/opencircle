"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type DMListItem = {
  conversationId: string;
  other: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

export async function getOrCreateDM(otherUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (otherUserId === user.id) return { error: "Cannot DM yourself." };

  // 1) Prefer atomic RPC (migration 011)
  const { data: rpcId, error: rpcError } = await supabase.rpc(
    "create_or_get_dm",
    { other_user_id: otherUserId }
  );

  if (!rpcError && rpcId) {
    const id = String(rpcId);
    // Confirm we can see our membership (avoids "Conversation not found")
    const { data: part } = await supabase
      .from("dm_participants")
      .select("user_id")
      .eq("conversation_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (part) return { conversationId: id };

    // Membership invisible — try to add ourselves
    await supabase.from("dm_participants").upsert({
      conversation_id: id,
      user_id: user.id,
    });
    return { conversationId: id };
  }

  // 2) Fallback without RPC
  const { data: blocked } = await supabase
    .from("blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`
    )
    .maybeSingle();
  if (blocked) return { error: "Cannot message this user." };

  // Find existing
  const { data: myParts } = await supabase
    .from("dm_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  for (const row of myParts || []) {
    const { data: other } = await supabase
      .from("dm_participants")
      .select("user_id")
      .eq("conversation_id", row.conversation_id)
      .eq("user_id", otherUserId)
      .maybeSingle();
    if (other) return { conversationId: row.conversation_id };
  }

  // Create conversation
  const { data: convo, error: convoErr } = await supabase
    .from("dm_conversations")
    .insert({ type: "direct" })
    .select("id")
    .single();

  if (convoErr || !convo) {
    return {
      error:
        (rpcError?.message ? `RPC: ${rpcError.message}. ` : "") +
        (convoErr?.message || "Failed to create conversation") +
        ". Run 011_dm_create_rpc.sql in Supabase.",
    };
  }

  // Self first, then other
  const { error: e1 } = await supabase.from("dm_participants").insert({
    conversation_id: convo.id,
    user_id: user.id,
  });
  if (e1) {
    return { error: `Could not join DM: ${e1.message}` };
  }

  const { error: e2 } = await supabase.from("dm_participants").insert({
    conversation_id: convo.id,
    user_id: otherUserId,
  });
  if (e2) {
    // Still usable for you even if other insert fails (they'll need invite later)
    console.error("other participant", e2.message);
  }

  return { conversationId: convo.id };
}

export async function assertDMAccess(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: part } = await supabase
    .from("dm_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (part) return { ok: true as const, userId: user.id };

  return { ok: false as const, error: "Conversation not found." };
}

export async function getMyDMs(): Promise<DMListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: parts } = await supabase
    .from("dm_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (!parts?.length) return [];

  const results: DMListItem[] = [];
  for (const p of parts) {
    const { data: others } = await supabase
      .from("dm_participants")
      .select(
        `user_id, profiles:user_id (id, username, display_name, avatar_url)`
      )
      .eq("conversation_id", p.conversation_id)
      .neq("user_id", user.id);

    const profile = others?.[0]?.profiles as
      | {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
        }
      | {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
        }[]
      | null
      | undefined;

    const other = Array.isArray(profile) ? profile[0] ?? null : profile ?? null;

    results.push({
      conversationId: p.conversation_id,
      other,
    });
  }
  return results;
}

export async function blockUser(blockedId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (blockedId === user.id) return { error: "Cannot block yourself." };

  const { error } = await supabase.from("blocks").upsert({
    blocker_id: user.id,
    blocked_id: blockedId,
  });

  if (error) return { error: error.message };
  revalidatePath("/app/friends");
  return { ok: true };
}

export async function unblockUser(blockedId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId);

  revalidatePath("/app/friends");
  return { ok: true };
}

export async function getBlocks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("blocks")
    .select(
      `blocked_id, profiles:blocked_id (id, username, display_name, avatar_url)`
    )
    .eq("blocker_id", user.id);

  return data || [];
}
