
ALTER TABLE public.debt_payments
ADD COLUMN payment_method text NOT NULL DEFAULT 'cash',
ADD COLUMN paid_by_name text NOT NULL DEFAULT '',
ADD COLUMN paid_to_name text NOT NULL DEFAULT '';
