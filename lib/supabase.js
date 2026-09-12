import { createClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "./supabase-config.js";

const { url, anonKey } = import.meta.env.DEV
  ? {
      url:
        import.meta.env.VITE_SUPABASE_URL ||
        "https://zinayjqfgvywlmybhvvy.supabase.co",
      anonKey:
        import.meta.env.VITE_SUPABASE_ANON_KEY ||
        "sb_publishable_xDfvLrIKLDlh8xKGAh0rCg_yWqUrKhr",
    }
  : requireSupabaseConfig({
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    });

export const supabase = createClient(url, anonKey, {
  global: {
    fetch: (input, init = {}) =>
      fetch(input, {
        ...init,
        signal: init.signal
          ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)])
          : AbortSignal.timeout(15000),
      }),
  },
});
