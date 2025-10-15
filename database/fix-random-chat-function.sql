-- Create cleanup function for random chat queue
-- Note: Random chat uses in-memory storage (Map objects), not database tables
-- This function exists to prevent errors but performs no operations

CREATE OR REPLACE FUNCTION cleanup_old_queue_entries()
RETURNS void AS $$
BEGIN
    -- No-op: Random chat system uses in-memory queue (Map objects in random-chat-manager.js)
    -- No database tables to clean up
    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_queue_entries() IS 'Placeholder function - random chat uses in-memory storage';
