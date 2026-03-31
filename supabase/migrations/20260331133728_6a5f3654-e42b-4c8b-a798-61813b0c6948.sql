
-- Add unique constraint for persistent_stock upsert (commodity + company_id)
ALTER TABLE public.persistent_stock DROP CONSTRAINT IF EXISTS persistent_stock_commodity_key;
ALTER TABLE public.persistent_stock ADD CONSTRAINT persistent_stock_commodity_company_unique UNIQUE (commodity, company_id);

-- Add unique constraint for daily_summaries upsert (date + company_id)
ALTER TABLE public.daily_summaries DROP CONSTRAINT IF EXISTS daily_summaries_date_key;
ALTER TABLE public.daily_summaries ADD CONSTRAINT daily_summaries_date_company_unique UNIQUE (date, company_id);
