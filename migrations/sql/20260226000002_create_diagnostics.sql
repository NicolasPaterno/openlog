-- migrate:up
CREATE TABLE IF NOT EXISTS diagnostics (
    id          BIGSERIAL    PRIMARY KEY,
    log_id      BIGINT       NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
    summary     TEXT         NOT NULL,
    severity    VARCHAR(20)  NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    suggestion  TEXT,
    model_used  VARCHAR(100),
    tokens_used INTEGER      DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagnostics_log_id ON diagnostics (log_id);
CREATE INDEX idx_diagnostics_severity ON diagnostics (severity);

-- migrate:down
DROP TABLE IF EXISTS diagnostics;
