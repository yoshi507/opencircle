import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SB_URL;
  const key = process.env.NEXT_PUBLIC_SB_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SB_URL or SB_KEY. Add them in Vercel Environment Variables."
    );
  }

  return createBrowserClient(url, key);
}
