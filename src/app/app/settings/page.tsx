"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, bio")
        .eq("id", user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
      }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || "User",
        bio: bio.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
    }
    setLoading(false);
  }

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
        <div className="max-w-lg space-y-8">
          <form onSubmit={handleSave} className="space-y-4">
            <h2 className="text-lg font-semibold">Profile</h2>
            <div>
              <label className="block text-sm font-medium mb-1.5">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={32}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={200}
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {saved && (
              <p className="text-sm text-green-500">Saved!</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save profile
            </button>
          </form>

          <div className="p-4 rounded-xl border border-border bg-card">
            <h3 className="font-medium mb-2">Sign out</h3>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
