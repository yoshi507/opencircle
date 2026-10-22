"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function listPublicServers() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("servers")
    .select("id, name, description, icon_url, visibility, created_at, owner_id")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    return [];
  }
  return data || [];
}

export async function joinPublicServer(serverId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: server } = await supabase
    .from("servers")
    .select("id, visibility")
    .eq("id", serverId)
    .single();

  if (!server) return { error: "Server not found." };
  if (server.visibility !== "public") {
    return { error: "This server is not public." };
  }

  // Already a member?
  const { data: existing } = await supabase
    .from("server_members")
    .select("user_id, membership_status")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.membership_status === "banned") {
    return { error: "You are banned from this server." };
  }

  if (existing?.membership_status === "active") {
    return { ok: true, already: true };
  }

  if (existing) {
    const { error } = await supabase
      .from("server_members")
      .update({ membership_status: "active" })
      .eq("server_id", serverId)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("server_members").insert({
      server_id: serverId,
      user_id: user.id,
      membership_status: "active",
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/discover");
  return { ok: true };
}

export async function setServerVisibility(
  serverId: string,
  visibility: "public" | "private"
) {
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
    return { error: "Only the owner can change visibility." };
  }

  const { error } = await supabase
    .from("servers")
    .update({ visibility })
    .eq("id", serverId);

  if (error) return { error: error.message };
  revalidatePath(`/app/servers/${serverId}/settings`);
  revalidatePath("/app/discover");
  return { ok: true };
}
