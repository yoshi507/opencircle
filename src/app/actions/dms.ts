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

  const { data: rpcId, error: rpcError } = await supabase.rpc(
    "create_or_get_dm",
    { other_user_id: otherUserId }
  );

  if (rpcError) {
    const msg = rpcError.message || "";
    if (/NOT_AUTHENTICATED/i.test(msg)) return { error: "Not signed in." };
    if (/INVALID_USER/i.test(msg)) return { error: "Invalid user." };
    if (/USER_NOT_FOUND/i.test(msg)) return { error: "User not found." };
    if (/BLOCKED/i.test(msg)) return { error: "Cannot message this user." };
    if (/Could not find the function|schema cache|does not exist/i.test(msg)) {
      return {
        error:
          "DM function missing. In Supabase SQL Editor run the full file 012_dm_nuclear_fix.sql",
      };
    }
    return { error: msg };
  }

  if (!rpcId) return { error: "No conversation id returned." };

  const id = String(rpcId);

  // Verify access via security-definer helper
  const { data: ok } = await supabase.rpc("is_dm_member", { conv_id: id });
  if (!ok) {
    return {
      error:
        "Created DM but membership check failed. Re-run 012_dm_nuclear_fix.sql in Supabase.",
    };
  }

  return { conversationId: id };
}

export async function checkDMAccess(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: ok, error } = await supabase.rpc("is_dm_member", {
    conv_id: conversationId,
  });

  if (error) {
    // Fallback direct select
    const { data: part } = await supabase
      .from("dm_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    return { ok: !!part, error: part ? undefined : error.message };
  }

  return { ok: !!ok };
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
    const { data: peer } = await supabase.rpc("get_dm_peer", {
      conv_id: p.conversation_id,
    });
    const row = Array.isArray(peer) ? peer[0] : peer;
    results.push({
      conversationId: p.conversation_id,
      other: row
        ? {
            id: row.id,
            username: row.username,
            display_name: row.display_name,
            avatar_url: row.avatar_url,
          }
        : null,
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
