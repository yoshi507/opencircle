"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_BOT_ID } from "@/lib/bot-engine";

function clientId() {
  return "oc" + randomBytes(8).toString("hex");
}

function secret() {
  return randomBytes(24).toString("hex");
}

function botToken() {
  return "oct_" + randomBytes(32).toString("hex");
}

export async function listMyApps() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("applications")
    .select(
      "id, name, description, icon_url, client_id, scopes, bot_user_id, created_at, updated_at"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getApp(appId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("applications")
    .select("*")
    .eq("id", appId)
    .eq("owner_id", user.id)
    .maybeSingle();

  return data;
}

export async function createApp(name: string, description?: string) {
  const cleaned = name.trim().slice(0, 80);
  if (cleaned.length < 2) return { error: "Name must be at least 2 characters." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const botUsername =
    cleaned
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .slice(0, 24) || "bot";

  // Create bot profile row (id must exist for FK — use random uuid)
  const botUserId = crypto.randomUUID();

  // profiles may require auth.users FK — try insert; if fails, still create app without bot_user_id
  const { error: profileErr } = await supabase.from("profiles").insert({
    id: botUserId,
    username: `${botUsername}_${botUserId.slice(0, 4)}`,
    display_name: cleaned,
    is_bot: true,
    status: "online",
  });

  const payload: Record<string, unknown> = {
    owner_id: user.id,
    name: cleaned,
    description: description?.trim() || null,
    client_id: clientId(),
    client_secret: secret(),
    bot_token: botToken(),
    scopes: ["bot", "messages.read", "messages.write"],
  };

  if (!profileErr) {
    payload.bot_user_id = botUserId;
  }

  const { data, error } = await supabase
    .from("applications")
    .insert(payload)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/app/developers");
  return { app: data };
}

export async function updateApp(
  appId: string,
  fields: {
    name?: string;
    description?: string;
    icon_url?: string;
    scopes?: string[];
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (fields.name !== undefined) updates.name = fields.name.trim().slice(0, 80);
  if (fields.description !== undefined)
    updates.description = fields.description.trim() || null;
  if (fields.icon_url !== undefined) updates.icon_url = fields.icon_url || null;
  if (fields.scopes !== undefined) updates.scopes = fields.scopes;

  const { data, error } = await supabase
    .from("applications")
    .update(updates)
    .eq("id", appId)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };

  // Sync bot display name
  if (data?.bot_user_id && fields.name) {
    await supabase
      .from("profiles")
      .update({ display_name: fields.name.trim().slice(0, 80) })
      .eq("id", data.bot_user_id);
  }

  revalidatePath("/app/developers");
  return { app: data };
}

export async function regenerateToken(appId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const token = botToken();
  const { data, error } = await supabase
    .from("applications")
    .update({ bot_token: token, updated_at: new Date().toISOString() })
    .eq("id", appId)
    .eq("owner_id", user.id)
    .select("id, bot_token")
    .single();

  if (error) return { error: error.message };
  return { token: data.bot_token };
}

export async function deleteApp(appId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", appId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/app/developers");
  return { ok: true };
}

export async function postBotReply(
  channelId: string,
  content: string,
  botUserId: string = SYSTEM_BOT_ID
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      channel_id: channelId,
      author_id: botUserId,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error("bot reply", error);
    return { error: error.message };
  }
  return { message: data };
}
