"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createServer(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;

  if (!name || name.length < 2 || name.length > 100) {
    return { error: "Server name must be between 2 and 100 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  // Create the server
  const { data: server, error: serverError } = await supabase
    .from("servers")
    .insert({
      name,
      description,
      owner_id: user.id,
      visibility: "private",
    })
    .select()
    .single();

  if (serverError || !server) {
    console.error(serverError);
    return { error: serverError?.message || "Failed to create server." };
  }

  // Add owner as member
  const { error: memberError } = await supabase.from("server_members").insert({
    server_id: server.id,
    user_id: user.id,
    membership_status: "active",
  });

  if (memberError) {
    console.error(memberError);
    // Clean up the server if membership fails
    await supabase.from("servers").delete().eq("id", server.id);
    return { error: "Failed to add you as a member." };
  }

  // Create a default "general" text channel
  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .insert({
      server_id: server.id,
      name: "general",
      type: "text",
      position: 0,
    })
    .select()
    .single();

  if (channelError) {
    console.error(channelError);
  }

  revalidatePath("/app");

  return {
    server,
    channelId: channel?.id ?? null,
  };
}

export async function getMyServers() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("server_members")
    .select(
      `
      server_id,
      servers (
        id,
        name,
        owner_id,
        description,
        icon_url,
        visibility,
        created_at
      )
    `
    )
    .eq("user_id", user.id)
    .eq("membership_status", "active");

  if (error) {
    console.error(error);
    return [];
  }

  return (data || [])
    .map((row: any) => row.servers)
    .filter(Boolean);
}
