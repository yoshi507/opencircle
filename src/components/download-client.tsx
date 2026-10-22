"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Monitor,
  Apple,
  Smartphone,
  Loader2,
} from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const platforms = [
  {
    id: "windows",
    name: "Windows",
    blurb: "Installer creates Desktop & Start Menu shortcuts in app mode.",
    href: "/downloads/OpenCircle-Windows.bat",
    filename: "OpenCircle-Setup.bat",
    icon: Monitor,
    hint: "Run the .bat file (Right-click → Run if SmartScreen appears).",
  },
  {
    id: "mac",
    name: "macOS",
    blurb: "Installs OpenCircle.app to Applications and your Desktop.",
    href: "/downloads/OpenCircle-Mac.command",
    filename: "OpenCircle-Mac.command",
    icon: Apple,
    hint: "Right-click → Open the first time to allow the installer.",
  },
  {
    id: "android",
    name: "Android",
    blurb: "Install as a full-screen app from Chrome or use the guide.",
    href: "/downloads/OpenCircle-Android.txt",
    filename: "OpenCircle-Android-Install.txt",
    icon: Smartphone,
    hint: "Prefer the Install button below when available.",
    pwa: true,
  },
  {
    id: "ios",
    name: "iOS",
    blurb: "Add to Home Screen in Safari for a native-style app.",
    href: "/downloads/OpenCircle-iOS.txt",
    filename: "OpenCircle-iOS-Install.txt",
    icon: Smartphone,
    hint: "Must use Safari → Share → Add to Home Screen.",
  },
];

export function DownloadClient() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  async function handlePwaInstall() {
    if (!deferred) return;
    setInstalling(true);
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
    setInstalling(false);
  }

  return (
    <div className="space-y-8">
      {(deferred || installed) && (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div>
            <p className="font-semibold">
              {installed ? "OpenCircle is installed" : "Install this device"}
            </p>
            <p className="text-sm text-muted-foreground">
              {installed
                ? "Launch it from your home screen or app list for the best experience."
                : "One tap installs OpenCircle like a native app — same UI as the site."}
            </p>
          </div>
          {!installed && deferred && (
            <button
              onClick={handlePwaInstall}
              disabled={installing}
              className="shrink-0 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2"
            >
              {installing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Install app
            </button>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {platforms.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.id}
              className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">{p.name}</h2>
                  <p className="text-sm text-muted-foreground">{p.blurb}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{p.hint}</p>
              <a
                href={p.href}
                download={p.filename}
                className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-accent text-sm font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                Download for {p.name}
              </a>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Desktop installers open OpenCircle in browser app mode (no tabs or URL
        bar). Mobile uses Home Screen install for a full-screen experience.
      </p>
    </div>
  );
}
