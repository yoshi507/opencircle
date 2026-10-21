import Link from "next/link";
import { getMyServers } from "@/app/actions/servers";
import { MessageCircle, Plus, Hash } from "lucide-react";
import { CreateServerButton } from "@/components/create-server-button";

export default async function AppHomePage() {
  const servers = await getMyServers();

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-12 px-4 flex items-center border-b border-border bg-card/30">
        <h1 className="font-semibold">Home</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome back 👋</h2>
            <p className="text-muted-foreground">
              Create a server or jump into one of your communities.
            </p>
          </div>

          {servers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Your servers
              </h3>
              <div className="grid gap-2">
                {servers.map((server: any) => (
                  <Link
                    key={server.id}
                    href={`/app/servers/${server.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
                      {server.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{server.name}</p>
                      {server.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {server.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Create a server</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Start a new community and invite your friends.
                </p>
                <div className="inline-block">
                  {/* The button opens a modal */}
                  <CreateServerHomeTrigger />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateServerHomeTrigger() {
  return (
    <div className="[&>button]:w-auto [&>button]:h-auto [&>button]:rounded-lg [&>button]:px-4 [&>button]:py-2 [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90 [&>button]:text-sm [&>button]:font-medium">
      <CreateServerButton />
    </div>
  );
}
