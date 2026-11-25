import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://xmgifcsigykhvxslelkb.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_TVBaMn2ivwrcA2PrJ2upjw__MzfM8J9';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
