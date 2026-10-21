"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { acceptInvite } from "@/app/actions/invites";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [status, setStatus] = useState<"loading" | "success" | "error" | "auth">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function run() {
      const result = await acceptInvite(code);

      if (result.needsAuth) {
        setStatus("auth");
        setMessage("You need to sign in to join this server.");
        return;
      }

      if (result.error) {
        setStatus("error");
        setMessage(result.error);
        return;
      }

      setStatus("success");
      setMessage(result.alreadyMember ? "You are already a member!" : "Joined successfully!");

      // Redirect into the server
      setTimeout(() => {
        router.push(`/app/servers/${result.serverId}`);
        router.refresh();
      }, 1200);
    }

    run();
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center shadow-xl">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Joining server…</h1>
            <p className="text-muted-foreground text-sm">Please wait</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">{message}</h1>
            <p className="text-muted-foreground text-sm">Redirecting you now…</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Could not join</h1>
            <p className="text-muted-foreground text-sm mb-6">{message}</p>
            <Link
              href="/app"
              className="inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Go home
            </Link>
          </>
        )}

        {status === "auth" && (
          <>
            <h1 className="text-xl font-bold mb-2">Sign in required</h1>
            <p className="text-muted-foreground text-sm mb-6">{message}</p>
            <div className="flex flex-col gap-2">
              <Link
                href={`/login?next=/invite/${code}`}
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium"
              >
                Sign in
              </Link>
              <Link
                href={`/register?next=/invite/${code}`}
                className="px-4 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium"
              >
                Create account
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
