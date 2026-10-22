import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMessages } from "@/app/actions/messages";
import { getServerMembers } from "@/app/actions/invites";
import { MessageList } from "@/components/message-list";
import { MessageComposer } from "@/components/message-composer";
import { MembersPanel } from "@/components/members-panel";
import { Hash, Settings } from "lucide-react";

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
        <p className="text-muted-foreground">You are not a member of this server.</p>
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

  const { data: server } = await supabase
    .from("servers")
    .select("owner_id, name")
    .eq("id", serverId)
    .maybeSingle();

  const isOwner = server?.owner_id === user.id;
  const messages = await getMessages(channelId);
  const members = await getServerMembers(serverId);

  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 px-4 flex items-center gap-2 border-b border-border bg-card/30 shrink-0">
          <Hash className="w-5 h-5 text-muted-foreground" />
          <h1 className="font-semibold flex-1 truncate">{channel.name}</h1>
          {isOwner && (
            <Link
              href={`/app/servers/${serverId}/settings`}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Server settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
          )}
        </header>

        <MessageList
          channelId={channelId}
          initialMessages={messages}
          currentUserId={user.id}
        />
        <MessageComposer channelId={channelId} />
      </div>

      <MembersPanel
        serverId={serverId}
        members={members as any}
        isOwner={isOwner}
        currentUserId={user.id}
      />
    </div>
  );
}
