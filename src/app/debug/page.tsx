export default function DebugPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="min-h-screen p-8 bg-background text-foreground font-mono text-sm">
      <h1 className="text-xl font-bold mb-6">OpenCircle Env Check</h1>

      <div className="space-y-4 max-w-2xl">
        <div className="p-4 rounded-lg border border-border bg-card">
          <p className="text-muted-foreground mb-1">NEXT_PUBLIC_SUPABASE_URL</p>
          <p className={url ? "text-green-400" : "text-red-400"}>
            {url ? url : "❌ MISSING"}
          </p>
        </div>

        <div className="p-4 rounded-lg border border-border bg-card">
          <p className="text-muted-foreground mb-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
          <p className={key ? "text-green-400" : "text-red-400"}>
            {key
              ? `${key.slice(0, 20)}...${key.slice(-10)} (length: ${key.length})`
              : "❌ MISSING"}
          </p>
        </div>

        <p className="text-muted-foreground text-xs mt-6">
          If both show green values, the env vars are reaching the app.
          If either says MISSING, Vercel is not injecting them — delete and re-add,
          then Redeploy.
        </p>
      </div>
    </div>
  );
}
