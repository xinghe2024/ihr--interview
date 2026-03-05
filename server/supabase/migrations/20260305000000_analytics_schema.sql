-- ============================================================
-- 003_analytics_schema.sql
-- 产品埋点 + 数据仪表盘基础表
-- ============================================================

-- ─── 原始事件表 ─────────────────────────────────
CREATE TABLE IF NOT EXISTS tracking_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name    VARCHAR(100) NOT NULL,
  properties    JSONB NOT NULL DEFAULT '{}',
  client_id     UUID,
  session_id    UUID,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  platform      VARCHAR(20) NOT NULL,
  app_version   VARCHAR(20),
  event_time    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_te_event_time ON tracking_events(event_time DESC);
CREATE INDEX idx_te_name_time ON tracking_events(event_name, event_time DESC);
CREATE INDEX idx_te_user_time ON tracking_events(user_id, event_time DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_te_platform ON tracking_events(platform, event_time DESC);

-- ─── 预聚合日指标表 ────────────────────────────
CREATE TABLE IF NOT EXISTS daily_metrics (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_date   DATE NOT NULL,
  metric_name   VARCHAR(100) NOT NULL,
  metric_value  NUMERIC NOT NULL,
  dimensions    JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(metric_date, metric_name, dimensions)
);

CREATE INDEX idx_dm_date_name ON daily_metrics(metric_date DESC, metric_name);
