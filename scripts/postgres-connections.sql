-- Read-only inventory; psql -X -v ON_ERROR_STOP=1 -f this-file.sql.
-- Run with a monitoring/admin identity; no query texts or personal rows emitted.
BEGIN READ ONLY;
SELECT name, setting
FROM pg_settings
WHERE name IN ('max_connections', 'reserved_connections',
               'superuser_reserved_connections');

SELECT datname, usename, application_name, backend_type, state, count(*)
FROM pg_stat_activity
GROUP BY 1, 2, 3, 4, 5 ORDER BY 1, 2, 3;

SELECT count(*) AS client_connections,
       count(*) FILTER (WHERE state = 'active') AS active,
       count(*) FILTER (WHERE state = 'idle') AS idle,
       count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
       max(clock_timestamp() - xact_start) AS longest_transaction
FROM pg_stat_activity WHERE backend_type = 'client backend';

SELECT rolname, rolconnlimit, rolsuper
FROM pg_roles WHERE rolcanlogin ORDER BY 1;
COMMIT;
