import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zinayjqfgvywlmybhvvy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xDfvLrIKLDlh8xKGAh0rCg_yWqUrKhr';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
