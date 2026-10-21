"use server";

import { createClient } from "@/lib/supabase/server";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
];

export async function uploadAttachment(
  channelId: string,
  formData: FormData
) {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file." };
  if (file.size > MAX_SIZE) return { error: "File must be under 5MB." };
  if (!ALLOWED.includes(file.type)) {
    return { error: "File type not allowed." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Membership check via channel
  const { data: channel } = await supabase
    .from("channels")
    .select("server_id")
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

  const ext = file.name.split(".").pop() || "bin";
  const path = `${channelId}/${user.id}/${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    // Bucket may not exist yet
    return {
      error:
        uploadError.message +
        " — Create a public/private bucket named 'attachments' in Supabase Storage.",
    };
  }

  // Create a message with the attachment reference
  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({
      channel_id: channelId,
      author_id: user.id,
      content: `📎 ${file.name}`,
    })
    .select()
    .single();

  if (msgError) return { error: msgError.message };

  await supabase.from("attachments").insert({
    message_id: message.id,
    storage_key: path,
    mime_type: file.type,
    size_bytes: file.size,
  });

  return { message, path };
}
