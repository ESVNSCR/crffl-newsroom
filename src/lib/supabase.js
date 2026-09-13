import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eazwhyzuavmmhzfxdcpj.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_O02enq4Lcd_wriAyDw6VMw_i7wiK0u_';

export const supabase = createClient(supabaseUrl, supabaseKey);

