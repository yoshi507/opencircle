import { MessageCircle, Plus, Sparkles } from "lucide-react";

export default function AppHomePage() {
  return (
    <div className="flex-1 flex flex-col">
      <header className="h-12 px-4 flex items-center border-b border-border bg-card/30">
        <h1 className="font-semibold">Home</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Welcome to OpenCircle 👋
            </h2>
            <p className="text-muted-foreground">
              Milestone 0 is live. Authentication, profiles and the app shell
              are ready. Next up: servers, channels and realtime messaging.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="p-5 rounded-xl border border-border bg-card">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Create your first server</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Coming in Milestone 1 — create communities, invite friends
                    and start chatting.
                  </p>
                  <button
                    disabled
                    className="text-sm px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground cursor-not-allowed"
                  >
                    Coming soon
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Direct messages</h3>
                  <p className="text-sm text-muted-foreground">
                    Private conversations with friends will appear here.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-dashed border-primary/30 bg-primary/5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">What&apos;s next?</h3>
                  <p className="text-sm text-muted-foreground">
                    Milestone 1: profiles, server creation, text channels,
                    roles, realtime messages and DMs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
