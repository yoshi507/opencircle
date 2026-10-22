import Link from "next/link";
import { MessageCircle, Shield, Zap, Download } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg">OpenCircle</span>
          <div className="flex items-center gap-3">
            <Link
              href="/download"
              className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              Download
            </Link>
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Communities that feel alive
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Messaging, voice, roles, bots, and discovery — free core features,
            built for the web and installable on every device.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              Create account
            </Link>
            <Link
              href="/download"
              className="px-6 py-3 rounded-xl border border-border hover:bg-accent font-semibold inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download app
            </Link>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-20 grid sm:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl border border-border bg-card">
            <MessageCircle className="w-8 h-8 text-primary mb-3" />
            <h2 className="font-semibold mb-1">Chat & voice</h2>
            <p className="text-sm text-muted-foreground">
              Realtime messages, threads, and LiveKit voice/video channels.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <Shield className="w-8 h-8 text-primary mb-3" />
            <h2 className="font-semibold mb-1">Safe by default</h2>
            <p className="text-sm text-muted-foreground">
              Roles, moderation tools, audit logs, and server-side permissions.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card">
            <Zap className="w-8 h-8 text-primary mb-3" />
            <h2 className="font-semibold mb-1">Bots & apps</h2>
            <p className="text-sm text-muted-foreground">
              Built-in bot commands plus a developer portal for your own apps.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <Link href="/download" className="hover:text-foreground">
          Download for Windows, Mac, Android & iOS
        </Link>
      </footer>
    </div>
  );
}
