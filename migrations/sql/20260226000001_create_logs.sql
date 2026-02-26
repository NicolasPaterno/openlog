-- migrate:up
CREATE TABLE IF NOT EXISTS logs (
    id          BIGSERIAL    PRIMARY KEY,
    source      VARCHAR(255) NOT NULL,
    level       VARCHAR(20)  NOT NULL CHECK (level IN ('DEBUG','INFO','WARN','ERROR','FATAL')),
    message     TEXT         NOT NULL,
    metadata    JSONB        DEFAULT '{}',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_level ON logs (level);
CREATE INDEX idx_logs_source ON logs (source);
CREATE INDEX idx_logs_created_at ON logs (created_at DESC);

-- migrate:down
DROP TABLE IF EXISTS logs;
