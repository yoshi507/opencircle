import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Support both the short names and the classic long names
  const url =
    process.env.NEXT_PUBLIC_SB_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SB_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. Add NEXT_PUBLIC_SB_URL and NEXT_PUBLIC_SB_KEY in Vercel."
    );
  }

  return createBrowserClient(url, key);
}
