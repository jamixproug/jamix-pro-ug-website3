import { createClient } from
'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://zrdeyvvufcxkiugcpuqh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_syI_TVVAJtLs7AY6KTIccA_JDmbfoXb';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
