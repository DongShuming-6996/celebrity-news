-- ============================================
-- 名人红人每日资讯汇报 - 数据库建表
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================

-- 用户订阅表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  celebrities JSONB NOT NULL DEFAULT '[]',
  report_time TEXT NOT NULL,
  report_frequency TEXT NOT NULL DEFAULT 'daily',
  report_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 汇报记录表
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  celebrity TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('simulated', 'manual')),
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用量限制表
CREATE TABLE IF NOT EXISTS usage_limits (
  email TEXT PRIMARY KEY,
  subscribe_count INTEGER DEFAULT 0,
  trigger_count INTEGER DEFAULT 0
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_user_email ON reports(user_email);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
