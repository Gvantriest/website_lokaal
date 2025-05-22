-- Enable the uuid-ossp extension if not already enabled (alternative: use gen_random_uuid())
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the recipes table
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    ingredients TEXT,
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS) for the recipes table
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
-- Policies will be defined in a subsequent step.

-- Example of a basic policy (for testing, usually more restrictive policies are needed)
-- CREATE POLICY "Users can see their own recipes"
-- ON recipes FOR SELECT
-- USING (auth.uid() = user_id);

-- CREATE POLICY "Users can insert their own recipes"
-- ON recipes FOR INSERT
-- WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users can update their own recipes"
-- ON recipes FOR UPDATE
-- USING (auth.uid() = user_id)
-- WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users can delete their own recipes"
-- ON recipes FOR DELETE
-- USING (auth.uid() = user_id);