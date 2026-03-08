ALTER TABLE public.sales_entries 
  ADD COLUMN gross_weight numeric NOT NULL DEFAULT 0,
  ADD COLUMN container_weight numeric NOT NULL DEFAULT 0,
  ADD COLUMN is_exchange boolean NOT NULL DEFAULT false,
  ADD COLUMN exchange_commodity text DEFAULT NULL,
  ADD COLUMN exchange_weight numeric DEFAULT NULL;