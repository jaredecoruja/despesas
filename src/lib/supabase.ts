import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn("Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.");
}

export const supabase = createClient(
  supabaseUrl || "https://zqltesejplhvdiupkmhv.supabase.co",
  supabasePublishableKey || "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
