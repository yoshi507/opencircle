"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-12 px-4 flex items-center border-b border-border bg-card/30">
        <h1 className="font-semibold">Settings</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Account</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Profile editing and privacy controls arrive in Milestone 1.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <h3 className="font-medium mb-2">Sign out</h3>
            <p className="text-sm text-muted-foreground mb-3">
              End your current session on this device.
            </p>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
