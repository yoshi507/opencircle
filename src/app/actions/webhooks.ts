"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

function isValidUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function listWebhooks(serverId: string) {
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
    .from("webhooks")
    .select("id, url, events, enabled, created_at")
    .eq("server_id", serverId)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function createWebhook(serverId: string, url: string) {
  if (!isValidUrl(url)) {
    return { error: "URL must start with http:// or https://" };
  }

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
    return { error: "Only the owner can manage webhooks." };
  }

  const secret = randomBytes(24).toString("hex");

  const { data, error } = await supabase
    .from("webhooks")
    .insert({
      server_id: serverId,
      url: url.trim(),
      secret,
      events: ["message.created"],
      enabled: true,
      created_by: user.id,
    })
    .select("id, url, secret, events, enabled")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/app/servers/${serverId}/settings`);
  return { webhook: data };
}

export async function deleteWebhook(serverId: string, webhookId: string) {
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
    return { error: "Only the owner can manage webhooks." };
  }

  const { error } = await supabase
    .from("webhooks")
    .delete()
    .eq("id", webhookId)
    .eq("server_id", serverId);

  if (error) return { error: error.message };
  revalidatePath(`/app/servers/${serverId}/settings`);
  return { ok: true };
}
