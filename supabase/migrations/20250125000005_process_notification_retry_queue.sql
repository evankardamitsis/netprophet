-- Background function to process notification retry queue
-- This should be called by a cron job or edge function periodically

CREATE OR REPLACE FUNCTION process_notification_retry_queue()
RETURNS TABLE(
    processed_count INTEGER,
    failed_count INTEGER,
    still_pending_count INTEGER
) AS $$
DECLARE
    queue_item RECORD;
    success BOOLEAN;
    processed INTEGER := 0;
    failed INTEGER := 0;
    still_pending INTEGER := 0;
BEGIN
    -- Process pending items that are ready for retry
    FOR queue_item IN
        SELECT *
        FROM notification_retry_queue
        WHERE status = 'pending'
        AND next_retry_at <= NOW()
        AND retry_count < max_retries
        ORDER BY created_at ASC
        LIMIT 100 -- Process in batches
        FOR UPDATE SKIP LOCKED -- Prevent concurrent processing
    LOOP
        -- Mark as processing
        UPDATE notification_retry_queue
        SET status = 'processing'
        WHERE id = queue_item.id;
        
        -- Attempt to create notification
        BEGIN
            success := create_notification_with_retry(
                queue_item.user_id,
                queue_item.notification_data->>'email',
                queue_item.notification_data->>'first_name',
                queue_item.notification_data->>'last_name',
                queue_item.notification_data->>'registration_type',
                queue_item.notification_type
            );
            
            IF success THEN
                -- Mark as completed
                UPDATE notification_retry_queue
                SET status = 'completed',
                    retry_count = retry_count + 1
                WHERE id = queue_item.id;
                processed := processed + 1;
                RAISE LOG '[RETRY SUCCESS] Processed queued notification for user %', queue_item.notification_data->>'email';
            ELSE
                -- Increment retry count and schedule next retry
                UPDATE notification_retry_queue
                SET status = 'pending',
                    retry_count = retry_count + 1,
                    next_retry_at = NOW() + (INTERVAL '1 minute' * POWER(2, retry_count)), -- Exponential backoff
                    last_error = 'Retry failed'
                WHERE id = queue_item.id;
                still_pending := still_pending + 1;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Update retry count and schedule next retry
                UPDATE notification_retry_queue
                SET status = 'pending',
                    retry_count = retry_count + 1,
                    next_retry_at = NOW() + (INTERVAL '1 minute' * POWER(2, retry_count)),
                    last_error = SQLERRM
                WHERE id = queue_item.id;
                
                IF queue_item.retry_count + 1 >= queue_item.max_retries THEN
                    -- Mark as failed after max retries
                    UPDATE notification_retry_queue
                    SET status = 'failed'
                    WHERE id = queue_item.id;
                    failed := failed + 1;
                    RAISE LOG '[RETRY FAILED] Max retries reached for user %', queue_item.notification_data->>'email';
                ELSE
                    still_pending := still_pending + 1;
                END IF;
        END;
    END LOOP;
    
    -- Return statistics
    RETURN QUERY SELECT processed, failed, still_pending;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION process_notification_retry_queue() TO service_role;

COMMENT ON FUNCTION process_notification_retry_queue() IS 
'Processes the notification retry queue. Should be called periodically by a cron job or edge function.
Returns statistics about processed, failed, and still pending items.';

-- Optional: Create a cron job to run this every 5 minutes
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule(
--     'process-notification-retry-queue',
--     '*/5 * * * *', -- Every 5 minutes
--     $$SELECT process_notification_retry_queue()$$
-- );
