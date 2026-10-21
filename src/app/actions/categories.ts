"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCategory(serverId: string, name: string) {
  const cleaned = name.trim().slice(0, 100);
  if (!cleaned) return { error: "Name required." };

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
    return { error: "Only owner can create categories." };
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ server_id: serverId, name: cleaned, position: 0 })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/app/servers/${serverId}`);
  return { category: data };
}

export async function getCategories(serverId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("server_id", serverId)
    .order("position");
  return data || [];
}
