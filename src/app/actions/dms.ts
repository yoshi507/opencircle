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

  const { data: blocked } = await supabase
    .from("blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`
    )
    .maybeSingle();

  if (blocked) return { error: "Cannot message this user." };

  const { data: myConvos } = await supabase
    .from("dm_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (myConvos?.length) {
    for (const c of myConvos) {
      const { data: other } = await supabase
        .from("dm_participants")
        .select("user_id")
        .eq("conversation_id", c.conversation_id)
        .eq("user_id", otherUserId)
        .maybeSingle();
      if (other) {
        return { conversationId: c.conversation_id };
      }
    }
  }

  const { data: convo, error } = await supabase
    .from("dm_conversations")
    .insert({ type: "direct" })
    .select()
    .single();

  if (error || !convo) return { error: error?.message || "Failed to create DM." };

  await supabase.from("dm_participants").insert([
    { conversation_id: convo.id, user_id: user.id },
    { conversation_id: convo.id, user_id: otherUserId },
  ]);

  return { conversationId: convo.id };
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
      | { id: string; username: string; display_name: string; avatar_url: string | null }
      | { id: string; username: string; display_name: string; avatar_url: string | null }[]
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
