import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerRoles } from "@/app/actions/roles";
import { getAuditLogs } from "@/app/actions/moderation";
import { listWebhooks } from "@/app/actions/webhooks";
import { ServerSettingsClient } from "@/components/server-settings-client";

export default async function ServerSettingsPage({
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

  const { data: server } = await supabase
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  if (!server || server.owner_id !== user.id) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground">Only the owner can manage settings.</p>
      </div>
    );
  }

  const roles = await getServerRoles(serverId);
  const logs = await getAuditLogs(serverId);
  const webhooks = await listWebhooks(serverId);

  return (
    <ServerSettingsClient
      server={server}
      roles={roles}
      auditLogs={logs}
      webhooks={webhooks as any}
      serverId={serverId}
    />
  );
}
