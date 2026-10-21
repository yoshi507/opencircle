"use client";

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
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Server rail (leftmost) */}
      <div className="w-[72px] flex-shrink-0 bg-[#0c0c0e] flex flex-col items-center py-3 gap-2 border-r border-border">
        <Link
          href="/app"
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
            pathname === "/app"
              ? "bg-primary text-primary-foreground rounded-xl"
              : "bg-card text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:rounded-xl"
          )}
          title="Home"
        >
          <Home className="w-5 h-5" />
        </Link>

        <div className="w-8 h-0.5 bg-border rounded-full my-1" />

        {/* Placeholder for future servers */}
        <button
          className="w-12 h-12 rounded-2xl bg-card text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:rounded-xl flex items-center justify-center transition-all"
          title="Add a server"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Secondary sidebar */}
      <div className="w-60 flex-shrink-0 bg-card border-r border-border flex flex-col">
        <div className="h-12 px-4 flex items-center border-b border-border">
          <span className="font-semibold truncate">OpenCircle</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <NavItem
            href="/app"
            icon={<MessageCircle className="w-4 h-4" />}
            label="Home"
            active={pathname === "/app"}
          />
          <NavItem
            href="/app/friends"
            icon={<Users className="w-4 h-4" />}
            label="Friends & DMs"
            active={pathname.startsWith("/app/friends")}
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
          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">Online</p>
            </div>
            <Link
              href="/app/settings"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

function NavItem({
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
