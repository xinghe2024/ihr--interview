-- 关联智联招聘账号：users 表新增 zhaopin_user_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS zhaopin_user_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_zhaopin_user_id ON users(zhaopin_user_id);
