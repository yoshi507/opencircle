"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getServerChannels(serverId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Verify membership
  const { data: membership } = await supabase
    .from("server_members")
    .select("user_id")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .single();

  if (!membership) return [];

  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .eq("server_id", serverId)
    .order("position", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

export async function createChannel(formData: FormData) {
  const serverId = formData.get("serverId") as string;
  const name = (formData.get("name") as string)?.trim().toLowerCase().replace(/\s+/g, "-");

  if (!serverId || !name || name.length < 1 || name.length > 100) {
    return { error: "Invalid channel name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." };

  // Check membership + ownership for now (simple)
  const { data: server } = await supabase
    .from("servers")
    .select("owner_id")
    .eq("id", serverId)
    .single();

  if (!server || server.owner_id !== user.id) {
    return { error: "Only the server owner can create channels right now." };
  }

  const { data: channel, error } = await supabase
    .from("channels")
    .insert({
      server_id: serverId,
      name,
      type: "text",
      position: 0,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/app/servers/${serverId}`);
  return { channel };
}
