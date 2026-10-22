import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkDMAccess } from "@/app/actions/dms";
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

  const access = await checkDMAccess(conversationId);
  if (!access.ok) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
        <p className="text-muted-foreground text-center max-w-sm">
          Conversation not found.
        </p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          In Supabase → SQL Editor, paste and run the entire file{" "}
          <code className="text-foreground">012_dm_nuclear_fix.sql</code>, then
          start the DM again from Friends.
        </p>
        <Link href="/app/friends" className="text-sm text-primary">
          Back to Friends
        </Link>
      </div>
    );
  }

  const { data: peerRows } = await supabase.rpc("get_dm_peer", {
    conv_id: conversationId,
  });
  const peer = Array.isArray(peerRows) ? peerRows[0] : peerRows;

  const { messages, channelId } = await getDMChannelMessages(conversationId);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="h-12 px-4 flex items-center border-b border-border bg-card/30 shrink-0">
        <h1 className="font-semibold">
          {peer?.display_name || peer?.username || "Direct Message"}
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
