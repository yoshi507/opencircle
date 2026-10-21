"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function writeAudit(
  supabase: any,
  actorId: string,
  serverId: string,
  action: string,
  targetId: string,
  reason?: string
) {
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    server_id: serverId,
    action,
    target_id: targetId,
    metadata: reason ? { reason } : {},
  });
  await supabase.from("moderation_cases").insert({
    server_id: serverId,
    actor_id: actorId,
    target_id: targetId,
    action,
    reason: reason || null,
  });
}

export async function kickMember(serverId: string, targetUserId: string, reason?: string) {
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
    return { error: "Only the owner can kick members." };
  }
  if (targetUserId === user.id) return { error: "You cannot kick yourself." };

  const { error } = await supabase
    .from("server_members")
    .update({ membership_status: "left" })
    .eq("server_id", serverId)
    .eq("user_id", targetUserId);

  if (error) return { error: error.message };

  await writeAudit(supabase, user.id, serverId, "kick", targetUserId, reason);
  revalidatePath(`/app/servers/${serverId}`);
  return { ok: true };
}

export async function banMember(serverId: string, targetUserId: string, reason?: string) {
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
    return { error: "Only the owner can ban members." };
  }
  if (targetUserId === user.id) return { error: "You cannot ban yourself." };

  const { error } = await supabase
    .from("server_members")
    .update({ membership_status: "banned" })
    .eq("server_id", serverId)
    .eq("user_id", targetUserId);

  if (error) return { error: error.message };

  await writeAudit(supabase, user.id, serverId, "ban", targetUserId, reason);
  revalidatePath(`/app/servers/${serverId}`);
  return { ok: true };
}

export async function getAuditLogs(serverId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: server } = await supabase
    .from("servers")
    .select("owner_id")
    .eq("id", serverId)
    .single();

  if (!server || server.owner_id !== user.id) return [];

  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("server_id", serverId)
    .order("created_at", { ascending: false })
    .limit(50);

  return data || [];
}
