-- name: InsertLog :one
INSERT INTO logs (source, level, message, metadata)
VALUES ($1, $2, $3, $4)
RETURNING id, source, level, message, metadata, created_at;

-- name: GetLogByID :one
SELECT id, source, level, message, metadata, created_at
FROM logs
WHERE id = $1;

-- name: ListLogs :many
SELECT id, source, level, message, metadata, created_at
FROM logs
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;
