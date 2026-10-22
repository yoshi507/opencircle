import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDMChannelMessages } from "@/app/actions/dm-messages";
import { DMChat } from "@/components/dm-chat";

export default async function DMPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!conversationId || conversationId === "undefined") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
        <p className="text-muted-foreground">Invalid conversation.</p>
        <Link href="/app/friends" className="text-sm text-primary">
          Back to Friends
        </Link>
      </div>
    );
  }

  let { data: part } = await supabase
    .from("dm_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  // If create_or_get_dm ran as SECURITY DEFINER but SELECT lag/policy glitch,
  // try joining as ourselves once.
  if (!part) {
    const { error: joinErr } = await supabase.from("dm_participants").insert({
      conversation_id: conversationId,
      user_id: user.id,
    });
    if (!joinErr) {
      part = { user_id: user.id };
    }
  }

  if (!part) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
        <p className="text-muted-foreground text-center">
          Conversation not found.
          <br />
          <span className="text-xs">
            If this is a new DM, run migration 011 in Supabase, then try again
            from Friends.
          </span>
        </p>
        <Link href="/app/friends" className="text-sm text-primary">
          Back to Friends
        </Link>
      </div>
    );
  }

  const { data: others } = await supabase
    .from("dm_participants")
    .select(`profiles:user_id (display_name, username)`)
    .eq("conversation_id", conversationId)
    .neq("user_id", user.id);

  const otherProfile = others?.[0]?.profiles;
  const other = Array.isArray(otherProfile) ? otherProfile[0] : otherProfile;

  const { messages, channelId } = await getDMChannelMessages(conversationId);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="h-12 px-4 flex items-center border-b border-border bg-card/30 shrink-0">
        <h1 className="font-semibold">
          {(other as any)?.display_name ||
            (other as any)?.username ||
            "Direct Message"}
        </h1>
      </header>
      <DMChat
        conversationId={conversationId}
        initialMessages={messages}
        channelId={channelId}
        currentUserId={user.id}
      />
    </div>
  );
}
