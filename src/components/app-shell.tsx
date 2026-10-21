"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageCircle,
  Users,
  Settings,
  LogOut,
  Plus,
  Hash,
  Home,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      username?: string;
      display_name?: string;
    };
  };
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const displayName =
    user.user_metadata?.display_name ||
    user.user_metadata?.username ||
    user.email?.split("@")[0] ||
    "User";

  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden bg-background">
      {/* ===== MOBILE TOP BAR ===== */}
      <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold">OpenCircle</span>
        <Link
          href="/app/settings"
          className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </header>

      {/* ===== MOBILE DRAWER OVERLAY ===== */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ===== SIDEBAR (desktop always visible, mobile as drawer) ===== */}
      <div
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 flex h-full transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Server rail */}
        <div className="w-[72px] flex-shrink-0 bg-[#0c0c0e] flex flex-col items-center py-3 gap-2 border-r border-border">
          <Link
            href="/app"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              pathname === "/app"
                ? "bg-primary text-primary-foreground rounded-xl"
                : "bg-card text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:rounded-xl"
            )}
          >
            <Home className="w-5 h-5" />
          </Link>

          <div className="w-8 h-0.5 bg-border rounded-full my-1" />

          <button
            className="w-12 h-12 rounded-2xl bg-card text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:rounded-xl flex items-center justify-center transition-all"
            title="Add a server"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Channel / nav sidebar */}
        <div className="w-60 flex-shrink-0 bg-card border-r border-border flex flex-col">
          <div className="h-12 px-4 flex items-center justify-between border-b border-border">
            <span className="font-semibold truncate">OpenCircle</span>
            <button
              className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <NavItem
              href="/app"
              icon={<MessageCircle className="w-4 h-4" />}
              label="Home"
              active={pathname === "/app"}
              onClick={() => setMobileOpen(false)}
            />
            <NavItem
              href="/app/friends"
              icon={<Users className="w-4 h-4" />}
              label="Friends & DMs"
              active={pathname.startsWith("/app/friends")}
              onClick={() => setMobileOpen(false)}
            />

            <div className="pt-4 pb-1 px-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Coming soon
              </p>
            </div>
            <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center gap-2 opacity-60">
              <Hash className="w-4 h-4" />
              <span>Servers & channels</span>
            </div>
          </div>

          {/* User footer */}
          <div className="p-2 border-t border-border">
            <div className="flex items-center gap-2 p-2 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">Online</p>
              </div>
              <Link
                href="/app/settings"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Settings className="w-4 h-4" />
              </Link>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 md:pb-0">
        {children}
      </main>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-card border-t border-border flex items-center justify-around z-30 safe-area-pb">
        <BottomNavItem
          href="/app"
          icon={<Home className="w-5 h-5" />}
          label="Home"
          active={pathname === "/app"}
        />
        <BottomNavItem
          href="/app/friends"
          icon={<Users className="w-5 h-5" />}
          label="Friends"
          active={pathname.startsWith("/app/friends")}
        />
        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-0.5 text-muted-foreground"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px]">Servers</span>
        </button>
        <BottomNavItem
          href="/app/settings"
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
          active={pathname.startsWith("/app/settings")}
        />
      </nav>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
        active
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function BottomNavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-0.5 min-w-[64px]",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </Link>
  );
}
