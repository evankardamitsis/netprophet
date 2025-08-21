-- Check if there are any notifications in the database
SELECT
    n.id,
    n.user_id,
    n.type,
    n.title,
    n.message,
    n.data,
    n.read_at,
    n.created_at,
    p.email
FROM notifications n
    JOIN profiles p ON n.user_id = p.id
ORDER BY n.created_at DESC
LIMIT 10;
