-- SQL script to manually update player photo_url from storage
-- This script helps sync photos that exist in storage but aren't linked in the database
-- 
-- Run this in Supabase SQL Editor
-- 
-- NOTE: You'll need to manually check the storage bucket and update the player IDs
-- Replace the UUIDs below with actual player IDs that have photos in storage

-- Example: Update a specific player's photo_url
-- Replace 'PLAYER_ID_HERE' with the actual player ID
-- Replace 'filename.jpg' with the actual filename from storage

-- UPDATE players
-- SET photo_url = CONCAT(
--     'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/athlete-photos/',
--     id,
--     '/',
--     'filename.jpg'
-- )
-- WHERE id = 'PLAYER_ID_HERE';

-- Or use this to get the public URL format:
-- The URL format is: https://{project-ref}.supabase.co/storage/v1/object/public/athlete-photos/{player-id}/{filename}

-- To find players with photos in storage but NULL photo_url:
-- 1. Go to Supabase Dashboard > Storage > athlete-photos
-- 2. Note the folder names (these are player IDs)
-- 3. Note the filenames inside each folder
-- 4. Run the UPDATE query above for each player

-- Example for multiple players:
-- UPDATE players
-- SET photo_url = 'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/athlete-photos/PLAYER_ID_1/filename1.jpg'
-- WHERE id = 'PLAYER_ID_1';

-- UPDATE players
-- SET photo_url = 'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/athlete-photos/PLAYER_ID_2/filename2.jpg'
-- WHERE id = 'PLAYER_ID_2';

-- Helper query: Check which players have photos in storage folders but NULL photo_url
-- (You'll need to manually check storage and match player IDs)
SELECT
    id,
    first_name,
    last_name,
    photo_url,
    CASE 
        WHEN photo_url IS NULL THEN '❌ Missing photo_url'
        WHEN photo_url = '' THEN '⚠️ Empty photo_url'
        ELSE '✅ Has photo_url'
    END as status
FROM players
WHERE photo_url IS NULL OR photo_url = ''
ORDER BY updated_at DESC;

-- After updating, verify the photo_url was set:
SELECT
    id,
    first_name,
    last_name,
    photo_url
FROM players
WHERE photo_url IS NOT NULL AND photo_url != ''
ORDER BY updated_at DESC;
