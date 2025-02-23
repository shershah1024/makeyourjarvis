-- Create user_auth table
CREATE TABLE IF NOT EXISTS user_auth (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    provider TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Additional user-specific columns
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    
    -- Preferences and settings
    theme TEXT DEFAULT 'light',
    notification_preferences JSONB DEFAULT '{"email": true, "push": true}'::jsonb,
    
    -- API usage and limits
    api_calls_count INTEGER DEFAULT 0,
    last_api_call TIMESTAMP WITH TIME ZONE,
    daily_api_limit INTEGER DEFAULT 1000,
    
    -- Custom user data
    custom_data JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    last_login TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    account_status TEXT DEFAULT 'active'
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_auth_user_id ON user_auth(user_id);

-- Create index on provider for filtering
CREATE INDEX IF NOT EXISTS idx_user_auth_provider ON user_auth(provider);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_auth ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read only their own data
CREATE POLICY "Users can view own data" ON user_auth
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- Policy to allow users to update their own data
CREATE POLICY "Users can update own data" ON user_auth
    FOR UPDATE
    USING (auth.uid()::text = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_user_auth_updated_at
    BEFORE UPDATE ON user_auth
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 