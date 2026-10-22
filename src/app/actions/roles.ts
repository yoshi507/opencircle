"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createRole(
  serverId: string,
  name: string,
  permissions: number = 0
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
    return { error: "Only owner can create roles." };
  }

  const { data, error } = await supabase
    .from("roles")
    .insert({
      server_id: serverId,
      name: name.trim().slice(0, 50),
      permissions,
      position: 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/app/servers/${serverId}`);
  return { role: data };
}

export async function assignRole(
  serverId: string,
  userId: string,
  roleId: string
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
    return { error: "Only owner can assign roles." };
  }

  const { error } = await supabase.from("member_roles").upsert({
    server_id: serverId,
    user_id: userId,
    role_id: roleId,
  });

  if (error) return { error: error.message };
  return { ok: true };
}

export async function getServerRoles(serverId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("roles")
    .select("*")
    .eq("server_id", serverId)
    .order("position", { ascending: false });
  return data || [];
}
