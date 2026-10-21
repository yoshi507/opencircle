import { createClient } from "@/lib/supabase/server";
import { getMyDMs, getBlocks } from "@/app/actions/dms";
import { FriendsClient } from "@/components/friends-client";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dms = await getMyDMs();
  const blocks = await getBlocks();

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-12 px-4 flex items-center border-b border-border bg-card/30">
        <h1 className="font-semibold">Friends & DMs</h1>
      </header>
      <FriendsClient
        initialDMs={dms as any}
        initialBlocks={blocks as any}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}
