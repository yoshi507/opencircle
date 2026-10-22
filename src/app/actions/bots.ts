"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { BUILTIN_BOT_ID } from "@/lib/bot-constants";

/** Respond as the built-in OpenCircle bot when a command is detected. */
export async function tryBuiltinBotReply(
  channelId: string,
  content: string,
  authorId: string
) {
  const text = content.trim();
  if (!text.startsWith("!") && !text.startsWith("/")) return null;

  const without = text.slice(1).trim();
  const [cmdRaw, ...args] = without.split(/\s+/);
  const cmd = (cmdRaw || "").toLowerCase();
  const argStr = args.join(" ");

  let reply: string | null = null;

  switch (cmd) {
    case "help":
      reply = [
        "**OpenCircle Bot** — commands",
        "`!help` — this list",
        "`!ping` — latency check",
        "`!serverinfo` — server details",
        "`!userinfo` — profile info",
        "`!8ball <question>` — magic 8-ball",
        "`!coinflip` — heads or tails",
        "`!dice [sides]` — roll a die (default 6)",
        "`!poll <question>` — quick poll",
        "`!remind <mins> <text>` — reminder note",
        "`!mod` — moderation tips",
        "`!ai <prompt>` — short AI-style reply",
      ].join("\n");
      break;
    case "ping":
      reply = "Pong! 🏓";
      break;
    case "8ball": {
      const answers = [
        "Yes.",
        "No.",
        "Ask again later.",
        "Definitely.",
        "I wouldn't count on it.",
        "Signs point to yes.",
        "Outlook not so good.",
        "Without a doubt.",
      ];
      reply = argStr
        ? `🎱 ${answers[Math.floor(Math.random() * answers.length)]}`
        : "Ask a question: `!8ball will it rain?`";
      break;
    }
    case "coinflip":
      reply = Math.random() < 0.5 ? "🪙 Heads" : "🪙 Tails";
      break;
    case "dice": {
      const sides = Math.min(100, Math.max(2, parseInt(args[0] || "6", 10) || 6));
      const roll = 1 + Math.floor(Math.random() * sides);
      reply = `🎲 You rolled **${roll}** (d${sides})`;
      break;
    }
    case "poll":
      reply = argStr
        ? `📊 **Poll:** ${argStr}\nReact with 👍 or 👎`
        : "Usage: `!poll Should we add cats?`";
      break;
    case "remind": {
      const mins = parseInt(args[0] || "", 10);
      const note = args.slice(1).join(" ");
      reply =
        mins > 0 && note
          ? `⏰ Reminder set for ~${mins} min: “${note}” (note it down — local reminder)`
          : "Usage: `!remind 10 take a break`";
      break;
    }
    case "mod":
      reply = [
        "**Moderation tips**",
        "• Use Server settings → roles & audit log",
        "• Kick/timeout members from the members panel (owner)",
        "• Keep invites private unless the server is public",
        "• Report abuse with clear evidence",
      ].join("\n");
      break;
    case "ai":
      reply = argStr
        ? await simpleAi(argStr)
        : "Usage: `!ai explain RLS in one sentence`";
      break;
    case "serverinfo":
      reply = await serverInfo(channelId);
      break;
    case "userinfo":
      reply = await userInfo(authorId);
      break;
    default:
      return null;
  }

  if (!reply) return null;

  const supabase = await createClient();
  await supabase.from("profiles").upsert(
    {
      id: BUILTIN_BOT_ID,
      username: "opencircle",
      display_name: "OpenCircle",
      is_bot: true,
      bio: "Official bot",
    },
    { onConflict: "id" }
  );

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      channel_id: channelId,
      author_id: BUILTIN_BOT_ID,
      content: reply,
    })
    .select()
    .single();

  if (error) {
    console.error("bot reply", error);
    return { ephemeral: reply, error: error.message };
  }

  return { message };
}

async function simpleAi(prompt: string) {
  const key = process.env.AI_KEY || process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are OpenCircle, a helpful community bot. Keep answers under 80 words.",
            },
            { role: "user", content: prompt.slice(0, 500) },
          ],
          max_tokens: 150,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.choices?.[0]?.message?.content || "…";
      }
    } catch {
      /* fall through */
    }
  }
  return `🤖 (offline AI) You asked: “${prompt.slice(0, 120)}”. Add AI_KEY in Vercel for full answers.`;
}

async function serverInfo(channelId: string) {
  const supabase = await createClient();
  const { data: channel } = await supabase
    .from("channels")
    .select("server_id, name")
    .eq("id", channelId)
    .single();
  if (!channel) return "Channel not found.";

  const { data: server } = await supabase
    .from("servers")
    .select("name, description, visibility, created_at")
    .eq("id", channel.server_id)
    .single();

  const { count } = await supabase
    .from("server_members")
    .select("*", { count: "exact", head: true })
    .eq("server_id", channel.server_id)
    .eq("membership_status", "active");

  return [
    `**${server?.name || "Server"}**`,
    server?.description || "_No description_",
    `Visibility: ${server?.visibility || "private"}`,
    `Members: ${count ?? "?"}`,
    `Channel: #${channel.name}`,
  ].join("\n");
}

async function userInfo(authorId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, created_at, is_bot")
    .eq("id", authorId)
    .single();

  if (!profile) return "User not found.";
  return [
    `**${profile.display_name || profile.username}** (@${profile.username})`,
    profile.bio || "_No bio_",
    profile.is_bot ? "Tag: BOT" : "Tag: User",
    profile.created_at
      ? `Joined: ${new Date(profile.created_at).toLocaleDateString()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
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
      "id, name, description, icon_url, client_id, scopes, bot_token, created_at, updated_at"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function createApp(form: {
  name: string;
  description?: string;
  scopes?: string[];
}) {
  const name = form.name.trim().slice(0, 80);
  if (!name) return { error: "Name required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const client_id = `oc${randomBytes(12).toString("hex")}`;
  const client_secret = randomBytes(24).toString("hex");
  const bot_token = `Bot.${randomBytes(32).toString("hex")}`;
  const scopes = form.scopes?.length
    ? form.scopes
    : ["bot", "messages.read", "messages.write"];

  const { data, error } = await supabase
    .from("applications")
    .insert({
      owner_id: user.id,
      name,
      description: form.description?.trim() || null,
      client_id,
      client_secret,
      bot_token,
      scopes,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/app/developers");
  return { app: data };
}

export async function updateApp(
  appId: string,
  updates: {
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

  const { data, error } = await supabase
    .from("applications")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appId)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/app/developers");
  return { app: data };
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

export async function regenerateBotToken(appId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const bot_token = `Bot.${randomBytes(32).toString("hex")}`;
  const { data, error } = await supabase
    .from("applications")
    .update({ bot_token, updated_at: new Date().toISOString() })
    .eq("id", appId)
    .eq("owner_id", user.id)
    .select("bot_token")
    .single();

  if (error) return { error: error.message };
  return { bot_token: data.bot_token };
}
