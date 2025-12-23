ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_financial_access BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profiles.has_financial_access IS 'If true, allows restricted access to financial module for non-admins (view today''s data only)';
