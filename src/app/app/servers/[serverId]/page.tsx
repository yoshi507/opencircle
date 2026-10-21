import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerChannels } from "@/app/actions/channels";
import Link from "next/link";
import { Hash } from "lucide-react";

export default async function ServerPage({
  params,
}: {
  params: Promise<{ serverId: string }>;
}) {
  const { serverId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify membership
  const { data: membership } = await supabase
    .from("server_members")
    .select("user_id")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .single();

  if (!membership) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground">You are not a member of this server.</p>
      </div>
    );
  }

  const { data: server } = await supabase
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  const channels = await getServerChannels(serverId);

  // Redirect to first channel if available
  if (channels.length > 0) {
    redirect(`/app/servers/${serverId}/channels/${channels[0].id}`);
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-12 px-4 flex items-center border-b border-border bg-card/30">
        <h1 className="font-semibold">{server?.name || "Server"}</h1>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <Hash className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">
            No channels yet.
          </p>
        </div>
      </div>
    </div>
  );
}
