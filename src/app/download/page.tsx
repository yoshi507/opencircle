import Link from "next/link";
import { DownloadClient } from "@/components/download-client";

export const metadata = {
  title: "Download OpenCircle",
  description: "Get OpenCircle for Windows, Mac, Android, and iOS",
};

export default function DownloadPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight">
            OpenCircle
          </Link>
          <Link
            href="/app"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Open web app
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Download OpenCircle
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Same smooth experience as the website — messaging, voice, servers,
            and bots — in a dedicated window on every platform.
          </p>
        </div>
        <DownloadClient />
      </main>
    </div>
  );
}
