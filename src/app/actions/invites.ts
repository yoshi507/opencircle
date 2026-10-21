"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomBytes, createHash } from "crypto";

function generateToken() {
  return randomBytes(16).toString("hex"); // 32 char hex
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createInvite(serverId: string, maxUses?: number, expiresInHours?: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." };

  // Only owner can create invites for now
  const { data: server } = await supabase
    .from("servers")
    .select("owner_id, name")
    .eq("id", serverId)
    .single();

  if (!server || server.owner_id !== user.id) {
    return { error: "Only the server owner can create invites." };
  }

  const token = generateToken();
  const tokenHash = hashToken(token);

  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from("invites").insert({
    server_id: serverId,
    created_by: user.id,
    token_hash: tokenHash,
    max_uses: maxUses ?? null,
    expires_at: expiresAt,
    uses: 0,
  });

  if (error) {
    console.error(error);
    return { error: error.message };
  }

  return {
    code: token,
    url: `/invite/${token}`,
    serverName: server.name,
  };
}

export async function acceptInvite(code: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in to accept an invite.", needsAuth: true };

  const tokenHash = hashToken(code);

  const { data: invite, error: inviteError } = await supabase
    .from("invites")
    .select("*")
    .eq("token_hash", tokenHash)
    .single();

  if (inviteError || !invite) {
    return { error: "Invalid or expired invite link." };
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { error: "This invite has expired." };
  }

  if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
    return { error: "This invite has reached its maximum uses." };
  }

  // Already a member?
  const { data: existing } = await supabase
    .from("server_members")
    .select("user_id")
    .eq("server_id", invite.server_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return { serverId: invite.server_id, alreadyMember: true };
  }

  // Join
  const { error: joinError } = await supabase.from("server_members").insert({
    server_id: invite.server_id,
    user_id: user.id,
    membership_status: "active",
  });

  if (joinError) {
    console.error(joinError);
    return { error: joinError.message };
  }

  // Increment uses
  await supabase
    .from("invites")
    .update({ uses: invite.uses + 1 })
    .eq("id", invite.id);

  revalidatePath("/app");
  return { serverId: invite.server_id };
}

export async function getServerMembers(serverId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("server_members")
    .select(
      `
      user_id,
      nickname,
      joined_at,
      profiles:user_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq("server_id", serverId)
    .eq("membership_status", "active");

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}
