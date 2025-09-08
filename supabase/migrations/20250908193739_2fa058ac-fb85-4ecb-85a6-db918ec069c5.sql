-- Set up automated daily metrics aggregation cron job
SELECT cron.schedule(
  'aggregate-daily-metrics',
  '0 1 * * *', -- Run at 1 AM daily
  $$
  SELECT aggregate_daily_metrics();
  $$
);