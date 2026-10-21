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

  const { data: part } = await supabase
    .from("dm_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!part) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground">Conversation not found.</p>
      </div>
    );
  }

  const { data: others } = await supabase
    .from("dm_participants")
    .select(`profiles:user_id (display_name, username)`)
    .eq("conversation_id", conversationId)
    .neq("user_id", user.id);

  const other = others?.[0]?.profiles as any;
  const { messages, channelId } = await getDMChannelMessages(conversationId);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="h-12 px-4 flex items-center border-b border-border bg-card/30 shrink-0">
        <h1 className="font-semibold">
          {other?.display_name || other?.username || "Direct Message"}
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
