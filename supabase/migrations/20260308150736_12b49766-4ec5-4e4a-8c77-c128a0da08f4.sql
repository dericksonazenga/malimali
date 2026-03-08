ALTER TABLE public.sales_entries ALTER COLUMN customer_name SET DEFAULT '';
ALTER TABLE public.sales_entries ALTER COLUMN customer_name DROP NOT NULL;