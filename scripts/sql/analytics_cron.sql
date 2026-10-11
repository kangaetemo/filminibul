-- Requires pg_cron (enable it in Supabase). Idempotent daily retention job.
-- 00:15 UTC = 03:15 Europe/Istanbul. No secrets or network requests required.
select cron.schedule('filminibul-analytics-retention', '15 0 * * *', 'select public.analytics_maintain();');
