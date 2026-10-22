import { createClient } from "@/lib/supabase/server";
import { listPublicServers } from "@/app/actions/discovery";
import { DiscoverClient } from "@/components/discover-client";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const servers = await listPublicServers();

  // Which ones the user already joined
  let joinedIds: string[] = [];
  if (user) {
    const { data } = await supabase
      .from("server_members")
      .select("server_id")
      .eq("user_id", user.id)
      .eq("membership_status", "active");
    joinedIds = (data || []).map((r) => r.server_id);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="h-12 px-4 flex items-center border-b border-border bg-card/30 shrink-0">
        <h1 className="font-semibold">Discover servers</h1>
      </header>
      <DiscoverClient servers={servers as any} joinedIds={joinedIds} />
    </div>
  );
}
