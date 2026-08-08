const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('未配置 SUPABASE_URL 或 SUPABASE_ANON_KEY 环境变量');
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase 客户端已初始化');
  return supabase;
}

module.exports = { getSupabase };
