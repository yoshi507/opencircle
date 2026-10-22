"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Monitor,
  Apple,
  Smartphone,
  Loader2,
  ExternalLink,
} from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const RELEASES =
  "https://github.com/yoshi507/opencircle/actions/workflows/build-native.yml";
const ARTIFACTS_HINT =
  "https://github.com/yoshi507/opencircle/actions";

const platforms = [
  {
    id: "windows",
    name: "Windows",
    ext: ".exe",
    blurb: "NSIS installer + portable OpenCircle.exe (Electron).",
    icon: Monitor,
    // Local fallback until CI artifact is published
    href: "/downloads/OpenCircle-Windows.bat",
    filename: "OpenCircle-Windows-fallback.bat",
    primary: "Build produces OpenCircle-*-Windows.exe",
  },
  {
    id: "mac",
    name: "macOS",
    ext: ".pkg",
    blurb: "macOS package installer for /Applications.",
    icon: Apple,
    href: "/downloads/OpenCircle-Mac.command",
    filename: "OpenCircle-Mac-fallback.command",
    primary: "Build produces OpenCircle-*-macOS.pkg",
  },
  {
    id: "android",
    name: "Android",
    ext: ".apk",
    blurb: "Release APK — install via Files or ADB.",
    icon: Smartphone,
    href: "/downloads/OpenCircle-Android.txt",
    filename: "OpenCircle-Android-guide.txt",
    primary: "Build produces app-release.apk",
  },
  {
    id: "ios",
    name: "iOS",
    ext: ".ipa",
    blurb: "IPA archive. Must be signed with your Apple Developer cert to install.",
    icon: Apple,
    href: "/downloads/OpenCircle-iOS.txt",
    filename: "OpenCircle-iOS-guide.txt",
    primary: "Build produces OpenCircle-unsigned.ipa",
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
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold text-lg">Native installers (.exe · .pkg · .apk · .ipa)</h2>
        <p className="text-sm text-muted-foreground">
          Real packages are built by GitHub Actions (Windows Electron .exe,
          macOS .pkg, Android .apk, iOS .ipa). Run the workflow, then download
          the artifacts.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={RELEASES}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            <ExternalLink className="w-4 h-4" />
            Run native build workflow
          </a>
          <a
            href={ARTIFACTS_HINT}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-accent"
          >
            Open Actions / artifacts
          </a>
        </div>
        <ol className="text-xs text-muted-foreground list-decimal pl-5 space-y-1">
          <li>Open the workflow → Run workflow</li>
          <li>Wait for Windows / macOS / Android / iOS jobs</li>
          <li>Download artifacts: windows-installers, macos-installers, android-apk, ios-ipa</li>
        </ol>
        <p className="text-xs text-amber-400/90">
          Note: .ipa is unsigned. Installing on a device requires your Apple
          Developer certificate (Xcode or AltStore / Sideloadly). Google Play /
          App Store listing is separate.
        </p>
      </div>

      {(deferred || installed) && (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div>
            <p className="font-semibold">
              {installed ? "Web app installed" : "Quick install (PWA)"}
            </p>
            <p className="text-sm text-muted-foreground">
              Instant full-screen install while native packages build.
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
              Install now
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
              className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">
                    {p.name}{" "}
                    <span className="text-primary text-sm font-mono">
                      {p.ext}
                    </span>
                  </h2>
                  <p className="text-sm text-muted-foreground">{p.blurb}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{p.primary}</p>
              <a
                href={ARTIFACTS_HINT}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-accent text-sm font-semibold"
              >
                <Download className="w-4 h-4" />
                Get {p.ext} from Actions
              </a>
              <a
                href={p.href}
                download={p.filename}
                className="text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Temporary helper download
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
