-- ============================================================
-- 001_initial_schema.sql
-- 艾琳 (Ailin) 初始数据库结构
-- 对齐 shared/types.ts 契约
-- ============================================================

-- ─── 启用 UUID 扩展 ──────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 用户表（HR） ────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone       VARCHAR(20) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL DEFAULT '',
  company     VARCHAR(200) NOT NULL DEFAULT '',
  role        VARCHAR(100) NOT NULL DEFAULT '',
  avatar      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 候选人表 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              VARCHAR(100) NOT NULL,
  phone             VARCHAR(20),
  email             VARCHAR(200),
  role              VARCHAR(200) NOT NULL,
  status            VARCHAR(30) NOT NULL DEFAULT 'PENDING_OUTREACH',
  recommendation    VARCHAR(20) DEFAULT NULL,
  avatar            TEXT NOT NULL DEFAULT '',
  resume_file_id    UUID,
  resume_data       JSONB,
  ksq_items         JSONB DEFAULT '[]',
  observations      JSONB DEFAULT '[]',
  landing_opened_at TIMESTAMPTZ,
  report_ready_at   TIMESTAMPTZ,
  evidence_playable BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidates_user_id ON candidates(user_id);
CREATE INDEX idx_candidates_status ON candidates(status);

-- ─── 文件表 ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name   VARCHAR(500) NOT NULL,
  mime_type   VARCHAR(100) NOT NULL,
  size        INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 面试会话表 ──────────────────────────────────
CREATE TABLE IF NOT EXISTS interviews (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id          UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel               VARCHAR(10) NOT NULL DEFAULT 'TEXT',
  status                VARCHAR(30) NOT NULL DEFAULT 'CREATED',
  ksq_items             JSONB DEFAULT '[]',
  baseline_items        JSONB DEFAULT '[]',
  max_duration_minutes  INTEGER NOT NULL DEFAULT 30,
  expires_at            TIMESTAMPTZ NOT NULL,
  started_at            TIMESTAMPTZ,
  ended_at              TIMESTAMPTZ,
  end_reason            VARCHAR(30),
  current_ksq_index     INTEGER NOT NULL DEFAULT 0,
  summary               JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX idx_interviews_status ON interviews(status);

-- ─── 面试消息表 ──────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  role          VARCHAR(20) NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  topic         VARCHAR(200),
  audio_url     TEXT,
  audio_duration INTEGER,
  is_transcript BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_session_id ON messages(session_id);

-- ─── 时间线事件表 ────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id  UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  event_code    VARCHAR(50),
  title         VARCHAR(200) NOT NULL,
  detail        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timeline_candidate_id ON timeline_events(candidate_id);

-- ─── 通知表 ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  candidate_name  VARCHAR(100) NOT NULL,
  candidate_role  VARCHAR(200) NOT NULL,
  event_type      VARCHAR(50) NOT NULL,
  message         TEXT NOT NULL,
  severity        VARCHAR(10) NOT NULL DEFAULT 'info',
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);

-- ─── HR 对话历史表（Sidebar Agent） ─────────────
CREATE TABLE IF NOT EXISTS chat_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL,
  content     TEXT NOT NULL,
  actions     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);

-- ─── updated_at 自动更新触发器 ──────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_candidates_updated_at
  BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_interviews_updated_at
  BEFORE UPDATE ON interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
