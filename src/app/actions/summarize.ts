"use server";

import { createClient } from "@/lib/supabase/server";

export async function summarizeChannel(channelId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: channel } = await supabase
    .from("channels")
    .select("server_id, name")
    .eq("id", channelId)
    .single();
  if (!channel) return { error: "Channel not found." };

  const { data: membership } = await supabase
    .from("server_members")
    .select("user_id")
    .eq("server_id", channel.server_id)
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .maybeSingle();
  if (!membership) return { error: "Not a member." };

  const { data: messages } = await supabase
    .from("messages")
    .select(
      `content, created_at, profiles:author_id (display_name, username)`
    )
    .eq("channel_id", channelId)
    .is("deleted_at", null)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(40);

  if (!messages?.length) {
    return { summary: "No messages in this channel yet." };
  }

  // Newest first from query — reverse for chronological
  const chronological = [...messages].reverse();

  const lines = chronological.map((m: any) => {
    const name =
      m.profiles?.display_name || m.profiles?.username || "Someone";
    return `${name}: ${(m.content || "").slice(0, 200)}`;
  });

  const blob = lines.join("\n");

  // Optional external AI if key is set
  const aiKey = process.env.AI_KEY || process.env.OPENAI_API_KEY;
  if (aiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Summarize this chat channel in 3–6 short bullet points. Be neutral and concise.",
            },
            { role: "user", content: blob.slice(0, 6000) },
          ],
          max_tokens: 300,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const text = json.choices?.[0]?.message?.content;
        if (text) return { summary: text };
      }
    } catch {
      // fall through to local summary
    }
  }

  // Local extractive summary (no external API required)
  const speakers = new Set(
    chronological.map(
      (m: any) => m.profiles?.display_name || m.profiles?.username || "Someone"
    )
  );
  const recent = chronological.slice(-5);
  const bullets = [
    `#${channel.name}: ${chronological.length} recent messages from ${speakers.size} people.`,
    ...recent.map((m: any) => {
      const name =
        m.profiles?.display_name || m.profiles?.username || "Someone";
      const text = (m.content || "").slice(0, 80);
      return `• ${name}: ${text}${(m.content || "").length > 80 ? "…" : ""}`;
    }),
  ];

  return { summary: bullets.join("\n") };
}
