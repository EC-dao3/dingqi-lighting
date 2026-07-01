-- Migration: Create email_verifications table
-- Stores verification codes before user registration completes

CREATE TABLE IF NOT EXISTS email_verifications (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verifications_email ON email_verifications(email, used);
CREATE INDEX idx_email_verifications_expires ON email_verifications(expires_at);

-- Cleanup old codes every hour (via pg_cron or manual)
-- DELETE FROM email_verifications WHERE expires_at < NOW();
