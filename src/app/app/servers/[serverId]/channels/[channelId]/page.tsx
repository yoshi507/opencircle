import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMessages } from "@/app/actions/messages";
import { MessageList } from "@/components/message-list";
import { MessageComposer } from "@/components/message-composer";
import { Hash } from "lucide-react";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ serverId: string; channelId: string }>;
}) {
  const { serverId, channelId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("server_members")
    .select("user_id")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .maybeSingle();

  if (!membership) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground">
          You are not a member of this server.
        </p>
      </div>
    );
  }

  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("id", channelId)
    .eq("server_id", serverId)
    .maybeSingle();

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground">Channel not found.</p>
      </div>
    );
  }

  const messages = await getMessages(channelId);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="h-12 px-4 flex items-center gap-2 border-b border-border bg-card/30 shrink-0">
        <Hash className="w-5 h-5 text-muted-foreground" />
        <h1 className="font-semibold">{channel.name}</h1>
        {channel.topic && (
          <span className="text-sm text-muted-foreground truncate hidden sm:inline">
            — {channel.topic}
          </span>
        )}
      </header>

      <MessageList channelId={channelId} initialMessages={messages} />
      <MessageComposer channelId={channelId} />
    </div>
  );
}
