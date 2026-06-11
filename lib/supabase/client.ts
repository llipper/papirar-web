import { createClient } from "@supabase/supabase-js"

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not configured.")
  }

  return createClient(supabaseUrl, supabaseKey)
}
