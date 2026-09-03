-- Cap retries without breaking existing flows
-- MAX = 2 (change MAX_RETRIES constant in worker/index.js to tune)
ALTER TABLE submissions ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
